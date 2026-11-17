// Importa os módulos oficiais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Suas credenciais do projeto ti-flashcard-ifrj
const firebaseConfig = {
  apiKey: "AIzaSyA0KO6KZS2MvVPmqM5Hb2d3gJEQgfEvUQs",
  authDomain: "ti-flashcard-ifrj.firebaseapp.com",
  projectId: "ti-flashcard-ifrj",
  storageBucket: "ti-flashcard-ifrj.firebasestorage.app",
  messagingSenderId: "77296619603",
  appId: "1:77296619603:web:39743e4aba7fe1ddc776a6",
};

// Inicializa o Firebase e exporta os serviços para as outras telas usarem
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
