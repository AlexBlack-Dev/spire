use std::path::{Path, PathBuf};

use crate::paths::is_sensitive_path;

const SCRIPT_EXTS: &[&str] = &["bat", "cmd", "ps1", "vbs", "js", "sh"];

fn validate_script(path: &str) -> Result<PathBuf, String> {
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    if !SCRIPT_EXTS.contains(&ext.as_str()) {
        return Err(format!("Unsupported script type: {}", ext));
    }
    let p = Path::new(path);
    if is_sensitive_path(p) {
        return Err("Blocked sensitive path".to_string());
    }
    let meta = std::fs::symlink_metadata(p)
        .map_err(|e| format!("Script not found: {} ({})", path, e))?;
    if meta.file_type().is_symlink() {
        return Err("Refusing to run a symlinked script".to_string());
    }
    if !meta.is_file() {
        return Err(format!("Not a regular file: {}", path));
    }
    let canonical = std::fs::canonicalize(p).map_err(|e| format!("Invalid script path: {}", e))?;
    if cfg!(windows) {
        let s = canonical.to_string_lossy();
        if s.contains('%') || s.contains('!') {
            return Err("Blocked characters in script path".to_string());
        }
    }
    Ok(canonical)
}

#[tauri::command]
pub fn run_script(path: String) -> Result<(), String> {
    let canonical = validate_script(&path)?;
    let safe_path = canonical.to_string_lossy().to_string();
    let ext = safe_path.rsplit('.').next().unwrap_or("").to_lowercase();

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let child = match ext.as_str() {
            "bat" | "cmd" => std::process::Command::new("cmd")
                .arg("/d")
                .raw_arg(format!("/c \"{}\"", &safe_path))
                .spawn(),
            "ps1" => std::process::Command::new("powershell")
                .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"])
                .arg(&safe_path)
                .spawn(),
            "vbs" | "js" => std::process::Command::new("cscript")
                .args(["/nologo"])
                .arg(&safe_path)
                .spawn(),
            _ => return Err(format!("Unsupported script type: {}", ext)),
        };
        return match child {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to start {}: {}", safe_path, e)),
        };
    }

    #[cfg(not(windows))]
    {
        let child = match ext.as_str() {
            "sh" => std::process::Command::new("bash").arg(&safe_path).spawn(),
            _ => return Err(format!("Unsupported script type on this platform: {}", ext)),
        };
        match child {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to start {}: {}", safe_path, e)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unsupported_extensions() {
        assert!(validate_script("/tmp/notes.txt").is_err());
    }

    #[test]
    fn rejects_sensitive_paths() {
        assert!(validate_script("/home/user/.ssh/run.bat").is_err());
    }

    #[test]
    fn accepts_regular_script_files() {
        let dir = std::env::temp_dir().join(format!("spire-script-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ok.bat");
        std::fs::write(&path, "echo ok").unwrap();
        assert!(validate_script(&path.to_string_lossy()).is_ok());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn rejects_percent_in_script_path() {
        let dir = std::env::temp_dir().join(format!("spire-script-pct-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("bad%name.bat");
        std::fs::write(&path, "echo bad").unwrap();
        assert!(validate_script(&path.to_string_lossy()).is_err());
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
