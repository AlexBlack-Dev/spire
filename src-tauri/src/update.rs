use std::io::Write;

use sha2::Digest;
use tauri::{AppHandle, Emitter, Manager};

use crate::paths::normalize_path;

const MAX_DOWNLOAD_BYTES: u64 = 512 * 1024 * 1024;

#[tauri::command]
pub async fn download_release(
    app: AppHandle,
    url: String,
    dest: String,
    expected_sha256: String,
) -> Result<(), String> {
    if !url.starts_with("https://github.com/AlexBlack-Dev/spire/releases/download/") {
        return Err(format!("Blocked download URL: {}", url));
    }
    let downloads_dir = app
        .path()
        .download_dir()
        .map_err(|e| format!("resolve downloads dir: {}", e))?;
    let norm_dest = normalize_path(&dest);
    let norm_downloads = normalize_path(&downloads_dir.to_string_lossy());
    if !norm_dest.starts_with(&norm_downloads) || norm_dest == norm_downloads {
        return Err(format!("Blocked destination outside downloads: {}", dest));
    }
    let ext = norm_dest
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if ext != "exe" && ext != "msi" && ext != "apk" {
        return Err(format!("Blocked destination extension: {}", ext));
    }

    let expected = {
        let trimmed = expected_sha256.trim().to_lowercase();
        let value = trimmed.trim_start_matches("sha256:").to_string();
        if value.len() != 64 || !value.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err("Missing or malformed SHA-256 digest for download".to_string());
        }
        value
    };

    let client = reqwest::Client::builder()
        .user_agent("Spire-Updater")
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(300))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| e.to_string())?;

    let mut res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("HTTP {}", res.status()));
    }

    let total = res.content_length().unwrap_or(0);
    if total > MAX_DOWNLOAD_BYTES {
        return Err("Download too large".to_string());
    }

    let part = std::path::PathBuf::from(format!("{}.part", norm_dest.display()));
    let mut out = match std::fs::File::create(&part) {
        Ok(file) => file,
        Err(e) => return Err(format!("create {}: {}", part.display(), e)),
    };
    let mut hasher = sha2::Sha256::new();
    let mut downloaded: u64 = 0;

    loop {
        let chunk = match res.chunk().await {
            Ok(Some(chunk)) => chunk,
            Ok(None) => break,
            Err(e) => {
                drop(out);
                let _ = std::fs::remove_file(&part);
                return Err(e.to_string());
            }
        };
        downloaded += chunk.len() as u64;
        if downloaded > MAX_DOWNLOAD_BYTES {
            drop(out);
            let _ = std::fs::remove_file(&part);
            return Err("Download too large".to_string());
        }
        hasher.update(&chunk);
        if let Err(e) = out.write_all(&chunk) {
            drop(out);
            let _ = std::fs::remove_file(&part);
            return Err(e.to_string());
        }
        if total > 0 {
            let percent = ((downloaded as f64 / total as f64) * 100.0) as u32;
            let _ = app.emit("update-progress", serde_json::json!({ "percent": percent }));
        }
    }

    if let Err(e) = out.sync_all() {
        drop(out);
        let _ = std::fs::remove_file(&part);
        return Err(e.to_string());
    }
    drop(out);

    let digest = format!("{:x}", hasher.finalize());
    if digest != expected {
        let _ = std::fs::remove_file(&part);
        return Err("SHA-256 mismatch for downloaded installer".to_string());
    }

    std::fs::rename(&part, &norm_dest).map_err(|e| {
        let _ = std::fs::remove_file(&part);
        format!("replace {}: {}", norm_dest.display(), e)
    })
}
