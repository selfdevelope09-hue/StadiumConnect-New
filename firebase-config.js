<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StadiumConnect</title>

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">

<!-- ✅ JUST PASTE FIREBASE CONFIG BELOW -->
<script>
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  appId: "PASTE_HERE"
};
</script>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

window.googleLogin = () => {
  signInWithRedirect(auth, provider);
};

getRedirectResult(auth)
.then((result) => {
  if (result?.user) {
    localStorage.setItem("user", JSON.stringify(result.user));
    window.location.href = "dashboard.html";
  }
})
.catch(err => console.error(err));
</script>

<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Inter}
body{display:flex;align-items:center;justify-content:center;height:100vh;background:#fff}
.container{text-align:center}
.logo{font-size:48px;font-weight:800;margin-bottom:40px}
.logo span{color:#ff6b35}
.btn{padding:14px 30px;border-radius:40px;cursor:pointer;margin:5px}
.login{border:1px solid #ff6b35;color:#ff6b35}
.register{background:#ff6b35;color:#fff}
.google{background:#4285F4;color:#fff}
.vendor{background:#28a745;color:#fff;margin-top:10px}
</style>

</head>
<body>

<div class="container">
  <div class="logo">STADIUM<span>CONNECT</span></div>

  <a href="login.html" class="btn login">Login</a>
  <a href="register.html" class="btn register">Register</a>
  <br>

  <button onclick="googleLogin()" class="btn google">
    Continue with Google
  </button>
  <br>

  <a href="https://forms.gle/t7oc3SeNvCMbdCVX7" target="_blank" class="btn vendor">
    Register as Vendor →
  </a>
</div>

</body>
</html>
