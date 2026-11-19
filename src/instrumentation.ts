import {
  checkDevSignInSetting,
  devSignInEnabled,
} from "./server/auth/dev-sign-in-setting";

// Runs once when the server starts. The app refuses to start with the
// development sign-in on outside localhost (docs/03-ARCHITECTURE.md, section 3).
export function register() {
  checkDevSignInSetting({
    devSignIn: devSignInEnabled(process.env.DEV_SIGN_IN),
    appUrl: process.env.APP_URL,
  });
}
