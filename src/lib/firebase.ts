import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDceVSebtb0HGzIJI4cUAMb4NeAtaf8jvU",
    authDomain: "mindify-93328.firebaseapp.com",
    projectId: "mindify-93328",
    storageBucket: "mindify-93328.firebasestorage.app",
    messagingSenderId: "729818727475",
    appId: "1:729818727475:web:c43916f98026f987070f46"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export default app;
