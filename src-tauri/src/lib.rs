use tauri::{Emitter, Manager};
#[cfg(windows)]
use std::path::PathBuf;
#[cfg(windows)]
use winreg::{RegKey, enums::HKEY_CURRENT_USER};

#[cfg(windows)]
fn register_file_icon(app: &tauri::App) {
    let icon_path: PathBuf = app.path().resource_dir()
        .unwrap_or_default()
        .join("icons")
        .join("spire-file.ico");

    if !icon_path.exists() {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()))
            .unwrap_or_default();
        let alt = exe_dir.join("spire-file.ico");
        if !alt.exists() { return; }
        set_registry_icon(&alt.to_string_lossy());
    } else {
        set_registry_icon(&icon_path.to_string_lossy());
    }
}

#[cfg(windows)]
fn set_registry_icon(icon_path: &str) {
    let extensions = [
        "txt", "md", "html", "json", "xml", "yaml", "yml", "csv",
        "css", "js", "ts", "py", "rs", "java", "c", "cpp", "h", "hpp",
        "sh", "bat", "ps1", "ini", "cfg", "conf", "log", "sql", "svg",
        "toml", "xlsx", "xls", "ods",
    ];

    let exe_path = std::env::current_exe()
        .ok()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    for ext in &extensions {
        let prog_id = format!("SPIRE.{}", ext);
        // Programmatic ID with Default value (friendly name)
        let _ = hkcu.create_subkey(format!("Software\\Classes\\{}", prog_id))
            .and_then(|k| k.0.set_value("", &format!("SPIRE {}", ext.to_uppercase())));
        // DefaultIcon
        let _ = hkcu.create_subkey(format!("Software\\Classes\\{}\\DefaultIcon", prog_id))
            .and_then(|k| k.0.set_value("", &icon_path));
        // Shell\Open\Command
        let _ = hkcu.create_subkey(format!("Software\\Classes\\{}\\shell\\open\\command", prog_id))
            .and_then(|k| k.0.set_value("", &format!("\"{}\" \"%1\"", exe_path)));
        // Extension -> ProgID
        let _ = hkcu.create_subkey(format!("Software\\Classes\\.{}\\OpenWithProgids", ext))
            .and_then(|k| k.0.set_value(prog_id.as_str(), &""));
    }
}

#[cfg(not(windows))]
fn register_file_icon(_app: &tauri::App) {}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn convert_image(input_path: String, output_path: String) -> Result<(), String> {
    let img = image::open(&input_path).map_err(|e| format!("Failed to open image: {}", e))?;
    img.save(&output_path).map_err(|e| format!("Failed to save image: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_binary(path: String) -> Result<String, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
    Ok(b64)
}

#[tauri::command]
fn save_binary(path: String, content: String) -> Result<(), String> {
    let data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &content)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_image_base64(path: String) -> Result<String, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
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
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg(windows)]
#[tauri::command]
fn migrate_from_blum() -> Result<Option<String>, String> {
    let dirs = [
        format!("{}\\com.blum.notes\\EBWebView\\Default\\Local Storage\\leveldb",
            std::env::var("LOCALAPPDATA").unwrap_or_default()),
        format!("{}\\com.blunt.notes\\EBWebView\\Default\\Local Storage\\leveldb",
            std::env::var("LOCALAPPDATA").unwrap_or_default()),
    ];

    let needle = b"blum-storage";
    for dir in &dirs {
        let path = std::path::Path::new(dir);
        if !path.exists() { continue; }
        let entries = match std::fs::read_dir(path) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let fpath = entry.path();
            let ext = fpath.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "ldb" && ext != "log" { continue; }
            let data = match std::fs::read(&fpath) {
                Ok(d) => d,
                Err(_) => continue,
            };
            if let Some(pos) = data.windows(needle.len()).position(|w| w == needle) {
                let after_key = &data[pos + needle.len()..];
                if let Some(json_start) = after_key.iter().position(|&b| b == b'{') {
                    let json_slice = &after_key[json_start..];
                    let mut depth = 0i32;
                    let mut end = 0;
                    for (i, &b) in json_slice.iter().enumerate() {
                        if b == b'{' { depth += 1; }
                        else if b == b'}' { depth -= 1; }
                        if depth == 0 { end = i + 1; break; }
                    }
                    if end > 0 {
                        let json_str = std::str::from_utf8(&json_slice[..end])
                            .map_err(|e| e.to_string())?;
                        let _: serde_json::Value = serde_json::from_str(json_str)
                            .map_err(|e| e.to_string())?;
                        return Ok(Some(json_str.to_string()));
                    }
                }
            }
        }
    }
    Ok(None)
}

#[cfg(not(windows))]
#[tauri::command]
fn migrate_from_blum() -> Result<Option<String>, String> {
    Ok(None)
}

#[cfg(target_os = "android")]
fn setup_panic_hook() {
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Trace)
            .with_tag("SPIRE"),
    );
    std::panic::set_hook(Box::new(|info| {
        let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            format!("{:?}", info)
        };
        let location = info
            .location()
            .map(|l| l.to_string())
            .unwrap_or_default();
        log::error!("PANIC: {} at {}", msg, location);
    }));
}

#[cfg(not(target_os = "android"))]
fn setup_panic_hook() {}

#[cfg(target_os = "android")]
fn open_app_settings_impl(_app: &tauri::AppHandle) -> Result<(), String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    wry::prelude::dispatch(move |env, activity, _webview| {
        use jni::objects::JValue;

        let result = (|| -> Result<(), String> {
            let action = env.new_string("android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION")
                .map_err(|e| e.to_string())?;

            let intent = env.new_object(
                "android/content/Intent",
                "(Ljava/lang/String;)V",
                &[(&action).into()],
            ).map_err(|e| e.to_string())?;

            let pkg = env.new_string("package:com.spire.notes")
                .map_err(|e| e.to_string())?;

            let uri = env.call_static_method(
                "android/net/Uri",
                "parse",
                "(Ljava/lang/String;)Landroid/net/Uri;",
                &[(&pkg).into()],
            ).map_err(|e| e.to_string())?;

            let uri_obj = uri.l().map_err(|e| e.to_string())?;

            env.call_method(
                &intent,
                "setData",
                "(Landroid/net/Uri;)Landroid/content/Intent;",
                &[JValue::Object(&uri_obj)],
            ).map_err(|e| e.to_string())?;

            env.call_method(
                activity,
                "startActivity",
                "(Landroid/content/Intent;)V",
                &[JValue::Object(&intent)],
            ).map_err(|e| e.to_string())?;

            Ok(())
        })();
        let _ = tx.send(result);
    });

    rx.recv().map_err(|e| format!("Channel error: {}", e))?
}

#[cfg(not(target_os = "android"))]
fn open_app_settings_impl(_app: &tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn open_app_settings(app: tauri::AppHandle) -> Result<(), String> {
    open_app_settings_impl(&app)
}

#[cfg(target_os = "android")]
fn check_storage_permission_impl() -> Result<bool, String> {
    use std::sync::mpsc;
    let (tx, rx) = mpsc::channel();

    wry::prelude::dispatch(move |env, _activity, _webview| {
        let result = match env.call_static_method(
            "android/os/Environment",
            "isExternalStorageManager",
            "()Z",
            &[],
        ) {
            Ok(v) => v.z().unwrap_or(false),
            Err(_) => {
                let _ = env.exception_clear();
                false
            }
        };
        let _ = tx.send(result);
    });

    rx.recv().map_err(|e| format!("Channel error: {}", e))
}

#[cfg(not(target_os = "android"))]
fn check_storage_permission_impl() -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
fn check_storage_permission() -> Result<bool, String> {
    check_storage_permission_impl()
}

// ---------------------------------------------------------------------------
// Save dialog: Android SAF via direct JNI + raw FD (official plugin pattern)
// Desktop via tauri-plugin-dialog
// ---------------------------------------------------------------------------
#[cfg(target_os = "android")]
mod android_save {
    use std::sync::mpsc;
    use std::sync::OnceLock;
    use std::time::Duration;

    static JVM: OnceLock<jni::JavaVM> = OnceLock::new();

    fn write_uri(uri: &str, content: &str) -> Result<(), String> {
        let jvm = JVM.get().ok_or("JVM not initialised")?;
        let mut env = jvm.attach_current_thread().map_err(|e| e.to_string())?;
        let j_uri = env.new_string(uri).map_err(|e| e.to_string())?;
        let j_content = env.new_string(content).map_err(|e| e.to_string())?;
        let ok = env.call_static_method(
            "com/spire/notes/MainActivity",
            "writeToUri",
            "(Ljava/lang/String;Ljava/lang/String;)Z",
            &[(&j_uri).into(), (&j_content).into()],
        ).map_err(|e| e.to_string())?
        .z()
        .map_err(|e| e.to_string())?;
        if ok { Ok(()) } else { Err("writeToUri returned false".into()) }
    }

    pub fn save_file_dialog(name: &str, content: &str) -> Result<Option<String>, String> {
        let name_owned = name.to_string();
        let content_owned = content.to_string();
        let (tx, rx) = mpsc::channel();
        wry::prelude::dispatch(move |env, activity, _webview| {
            use jni::objects::JValue;
            if let Ok(jvm) = env.get_java_vm() {
                let _ = JVM.set(jvm);
            }
            let j_name = match env.new_string(&name_owned) {
                Ok(s) => s,
                Err(e) => { let _ = tx.send(Err(e.to_string())); return; }
            };
            match env.call_method(
                activity,
                "startSave",
                "(ILjava/lang/String;)V",
                &[JValue::Int(0), (&j_name).into()],
            ) {
                Ok(_) => { let _ = tx.send(Ok(())); }
                Err(e) => { let _ = tx.send(Err(e.to_string())); }
            }
        });
        rx.recv().map_err(|e| format!("Channel error: {}", e))??;

        let jvm = JVM.get().ok_or("JVM not initialised")?;
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(120);

        loop {
            if start.elapsed() > timeout {
                return Err("Save dialog timed out".into());
            }
            let mut env = jvm.attach_current_thread().map_err(|e| e.to_string())?;

            let ready = env.call_static_method(
                "com/spire/notes/MainActivity",
                "isResultReady",
                "()Z",
                &[],
            ).map_err(|e| e.to_string())?
            .z()
            .unwrap_or(false);

            if ready {
                let uri_obj = env.call_static_method(
                    "com/spire/notes/MainActivity",
                    "getResultUri",
                    "()Ljava/lang/String;",
                    &[],
                ).map_err(|e| e.to_string())?
                .l()
                .map_err(|e| e.to_string())?;

                let uri_str = if !uri_obj.is_null() {
                    let jstr = jni::objects::JString::from(uri_obj);
                    env.get_string(&jstr)
                        .ok()
                        .map(|s| s.to_string_lossy().to_string())
                } else {
                    None
                };

                env.call_static_method(
                    "com/spire/notes/MainActivity",
                    "resetResult",
                    "()V",
                    &[],
                ).ok();

                if let Some(ref u) = uri_str {
                    if !u.is_empty() && write_uri(u, &content_owned).is_ok() {
                        return Ok(Some(u.clone()));
                    }
                }
                return Ok(None);
            }

            std::thread::sleep(Duration::from_millis(100));
        }
    }

    pub fn write_content_to_uri(uri: &str, content: &str) -> Result<(), String> {
        write_uri(uri, content)
    }
}

#[allow(unused_variables)]
#[tauri::command]
async fn save_file_dialog(
    app: tauri::AppHandle,
    file_name: Option<String>,
    content: String,
) -> Result<Option<String>, String> {
    let name = file_name.unwrap_or_else(|| "untitled.txt".to_string());

    #[cfg(target_os = "android")]
    {
        android_save::save_file_dialog(&name, &content)
    }

    #[cfg(not(target_os = "android"))]
    {
        use tauri_plugin_dialog::DialogExt;
        let file = app
            .dialog()
            .file()
            .add_filter("All Files", &["*"])
            .set_file_name(&name)
            .blocking_save_file();
        if let Some(p) = file {
            let path = p.to_string();
            std::fs::write(&path, &content).map_err(|e| e.to_string())?;
            return Ok(Some(path));
        }
        return Ok(None);
    }
}

#[tauri::command]
async fn write_content_to_uri(
    uri: String,
    content: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    if uri.starts_with("content://") {
        return android_save::write_content_to_uri(&uri, &content);
    }

    std::fs::write(&uri, &content).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// In-app file browser (Android with MANAGE_EXTERNAL_STORAGE)
// ---------------------------------------------------------------------------
#[derive(serde::Serialize)]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let dir = std::path::Path::new(&path);
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| format!("read_dir {:?}: {}", dir, e))? {
        let entry = entry.map_err(|e| e.to_string())?;
        let ft = entry.file_type().map_err(|e| e.to_string())?;
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: ft.is_dir(),
        });
    }
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(entries)
}

#[tauri::command]
fn get_storage_root() -> Result<String, String> {
    Ok("/storage/emulated/0".to_string())
}

#[tauri::command]
fn save_to_path(file_path: String, content: String) -> Result<(), String> {
    std::fs::write(&file_path, &content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_panic_hook();

    if let Err(e) = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())

        .setup(|app| {
            register_file_icon(app);

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(not(target_os = "android"))]
                let _ = window.set_zoom(1.25);

                let args: Vec<String> = std::env::args().collect();
                if let Some(path) = args.get(1).cloned() {
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(800));
                        let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
                        let binary_exts = ["xlsx", "xls", "ods"];
                        if binary_exts.contains(&ext.as_str()) {
                            match std::fs::read(&path) {
                                Ok(data) => {
                                    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
                                    let _ = window.emit("open-file", serde_json::json!({
                                        "path": path,
                                        "content": b64,
                                        "binary": true
                                    }));
                                }
                                Err(e) => eprintln!("Failed to read file {}: {}", path, e),
                            }
                        } else {
                            match std::fs::read_to_string(&path) {
                                Ok(content) => {
                                    let _ = window.emit("open-file", serde_json::json!({
                                        "path": path,
                                        "content": content,
                                        "binary": false
                                    }));
                                }
                                Err(e) => eprintln!("Failed to read file {}: {}", path, e),
                            }
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_file, rename_file, read_file,
            read_binary, save_binary,
            convert_image, read_image_base64, migrate_from_blum,
            open_app_settings, check_storage_permission,
            save_file_dialog, write_content_to_uri,
            list_directory, get_storage_root, save_to_path
        ])
        .run(tauri::generate_context!())
    {
        #[cfg(target_os = "android")]
        log::error!("Tauri run failed: {}", e);
        #[cfg(not(target_os = "android"))]
        eprintln!("Tauri run failed: {}", e);
    }
}
