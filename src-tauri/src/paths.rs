use std::path::{Component, Path, PathBuf};

pub fn normalize_path(p: &str) -> PathBuf {
    let mut out = PathBuf::new();
    for c in Path::new(p).components() {
        match c {
            Component::CurDir => {}
            Component::ParentDir => {
                let _ = out.pop();
            }
            other => out.push(other.as_os_str()),
        }
    }
    out
}

const SENSITIVE_DIRS: &[&str] = &[".ssh", ".gnupg", ".aws", ".azure", ".kube", "gcloud"];
const SENSITIVE_FILES: &[&str] = &[
    ".npmrc",
    ".netrc",
    ".git-credentials",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "credentials",
    "credentials.json",
];

pub fn is_sensitive_path(p: &Path) -> bool {
    let normalized = normalize_path(&p.to_string_lossy());
    for comp in normalized.components() {
        if let Component::Normal(c) = comp {
            let s = c.to_string_lossy().to_lowercase();
            if SENSITIVE_DIRS.contains(&s.as_str()) {
                return true;
            }
        }
    }
    if let Some(name) = normalized.file_name() {
        let s = name.to_string_lossy().to_lowercase();
        if SENSITIVE_FILES.contains(&s.as_str()) {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_parent_segments() {
        assert_eq!(normalize_path("/a/b/../c"), PathBuf::from("/a/c"));
        assert_eq!(normalize_path("/a/./b/"), PathBuf::from("/a/b"));
    }

    #[test]
    fn blocks_sensitive_directories_and_files() {
        assert!(is_sensitive_path(Path::new("/home/user/.ssh/id_ed25519")));
        assert!(is_sensitive_path(Path::new(
            "C:/Users/user/.aws/credentials"
        )));
        assert!(is_sensitive_path(Path::new("/tmp/.npmrc")));
    }

    #[test]
    fn allows_regular_files() {
        assert!(!is_sensitive_path(Path::new("/home/user/notes/todo.txt")));
        assert!(!is_sensitive_path(Path::new(
            "C:/Users/user/Documents/note.md"
        )));
    }
}
