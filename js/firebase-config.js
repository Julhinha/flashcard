// Importa os módulos oficiais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const env = window.ENV_LOCAL || {};

// Credenciais carregadas localmente (env.local.js) ou injetadas via GitHub Secrets
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY || "__FIREBASE_API_KEY__",
  authDomain: env.FIREBASE_AUTH_DOMAIN || "__FIREBASE_AUTH_DOMAIN__",
  projectId: env.FIREBASE_PROJECT_ID || "__FIREBASE_PROJECT_ID__",
  storageBucket: env.FIREBASE_STORAGE_BUCKET || "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId:
    env.FIREBASE_MESSAGING_SENDER_ID || "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: env.FIREBASE_APP_ID || "__FIREBASE_APP_ID__",
};

// Inicializa o Firebase e exporta os serviços para as outras telas usarem
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
