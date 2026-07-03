use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct ForegroundApp {
    pub bundle_id: String,
    pub app_name: String,
}

#[cfg(target_os = "macos")]
pub fn current_foreground_app() -> Result<ForegroundApp, AppError> {
    use cocoa::base::{id, nil};
    use objc::{class, msg_send, sel, sel_impl};
    use std::ffi::CStr;

    unsafe fn nsstring_to_string(value: id) -> String {
        if value == nil {
            return String::new();
        }

        let utf8_ptr: *const std::os::raw::c_char = msg_send![value, UTF8String];
        if utf8_ptr.is_null() {
            return String::new();
        }

        CStr::from_ptr(utf8_ptr).to_string_lossy().into_owned()
    }

    unsafe {
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let app: id = msg_send![workspace, frontmostApplication];

        let bundle_id: id = msg_send![app, bundleIdentifier];
        let app_name: id = msg_send![app, localizedName];

        Ok(ForegroundApp {
            bundle_id: nsstring_to_string(bundle_id),
            app_name: nsstring_to_string(app_name),
        })
    }
}

#[cfg(not(target_os = "macos"))]
pub fn current_foreground_app() -> Result<ForegroundApp, AppError> {
    Err(AppError::UnsupportedPlatform)
}
