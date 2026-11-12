use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;

use crate::paths::{is_sensitive_path, normalize_path};

const MAX_TEXT_BYTES: usize = 25 * 1024 * 1024;
const MAX_BINARY_BYTES: usize = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES: u64 = 50 * 1024 * 1024;

fn temp_path(path: &Path) -> Result<PathBuf, String> {
    let parent = match path.parent() {
        Some(p) if !p.as_os_str().is_empty() => p,
        _ => Path::new("."),
    };
    let name = path
        .file_name()
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_string_lossy();
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    Ok(parent.join(format!(".{}.{}.{}.tmp", name, std::process::id(), nanos)))
}

fn atomic_write(path: &Path, data: &[u8]) -> Result<(), String> {
    let tmp = temp_path(path)?;
    let write_result = (|| -> Result<(), String> {
        let mut file =
            std::fs::File::create(&tmp).map_err(|e| format!("create {}: {}", tmp.display(), e))?;
        file.write_all(data)
            .map_err(|e| format!("write {}: {}", tmp.display(), e))?;
        file.sync_all()
            .map_err(|e| format!("sync {}: {}", tmp.display(), e))?;
        Ok(())
    })();
    if let Err(e) = write_result {
        let _ = std::fs::remove_file(&tmp);
        return Err(e);
    }
    std::fs::rename(&tmp, path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("rename {}: {}", path.display(), e)
    })
}

pub(crate) fn write_text_file(path: &str, content: &str) -> Result<(), String> {
    if is_sensitive_path(Path::new(path)) {
        return Err("Blocked sensitive path".to_string());
    }
    if content.len() > MAX_TEXT_BYTES {
        return Err("File content exceeds the 25 MB limit".to_string());
    }
    atomic_write(Path::new(path), content.as_bytes())
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    let old = normalize_path(&old_path);
    let new = normalize_path(&new_path);
    if is_sensitive_path(&old) || is_sensitive_path(&new) {
        return Err("Blocked sensitive path".to_string());
    }
    if !old.exists() {
        return Err(format!("File not found: {}", old_path));
    }
    std::fs::rename(&old, &new).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn convert_image(input_path: String, output_path: String) -> Result<(), String> {
    let input = Path::new(&input_path);
    let output = Path::new(&output_path);
    if is_sensitive_path(input) || is_sensitive_path(output) {
        return Err("Blocked sensitive path".to_string());
    }
    let meta = std::fs::metadata(input).map_err(|e| format!("Failed to stat image: {}", e))?;
    if meta.len() > MAX_IMAGE_BYTES {
        return Err("Image exceeds the 50 MB limit".to_string());
    }
    let format = image::ImageFormat::from_path(output)
        .map_err(|e| format!("Unsupported image format: {}", e))?;
    let img = image::open(input).map_err(|e| format!("Failed to open image: {}", e))?;
    let tmp = temp_path(output)?;
    img.save_with_format(&tmp, format)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    std::fs::rename(&tmp, output).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("Failed to replace image: {}", e)
    })
}

#[tauri::command]
pub fn save_binary(path: String, content: String) -> Result<(), String> {
    if is_sensitive_path(Path::new(&path)) {
        return Err("Blocked sensitive path".to_string());
    }
    if content.len() > MAX_BINARY_BYTES * 4 / 3 + 4 {
        return Err("Binary content exceeds the 25 MB limit".to_string());
    }
    let data = base64::engine::general_purpose::STANDARD
        .decode(&content)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    if data.len() > MAX_BINARY_BYTES {
        return Err("Binary content exceeds the 25 MB limit".to_string());
    }
    atomic_write(Path::new(&path), &data)
}

#[tauri::command]
pub fn read_image_base64(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if is_sensitive_path(p) {
        return Err("Blocked sensitive path".to_string());
    }
    let meta = std::fs::metadata(p).map_err(|e| format!("Failed to stat file: {}", e))?;
    if meta.len() > MAX_IMAGE_BYTES {
        return Err("File too large to preview (50 MB cap)".to_string());
    }
    let data = std::fs::read(p).map_err(|e| format!("Failed to read file: {}", e))?;
    let ext = path.rsplit('.').next().unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => "image/png",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub fn save_to_path(file_path: String, content: String) -> Result<(), String> {
    write_text_file(&file_path, &content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn atomic_write_replaces_file_content() {
        let dir = std::env::temp_dir().join(format!("spire-atomic-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("note.txt");
        atomic_write(&path, b"first").unwrap();
        atomic_write(&path, b"second").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "second");
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn write_text_file_blocks_sensitive_paths() {
        assert!(write_text_file("/home/user/.ssh/note.txt", "x").is_err());
    }

    #[test]
    fn write_text_file_rejects_oversized_content() {
        let huge = "x".repeat(MAX_TEXT_BYTES + 1);
        assert!(write_text_file("/tmp/note.txt", &huge).is_err());
    }
}
