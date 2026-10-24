import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebase } from '../firebase';

const stamp = (data) => {
  const out = { ...data };
  for (const k of ['createdAt', 'updatedAt', 'reviewedAt']) if (out[k] === 'now') out[k] = serverTimestamp();
  return out;
};

export const onAuth = (cb) => onAuthStateChanged(getFirebase().auth, cb);
export const signIn = (email, password) => signInWithEmailAndPassword(getFirebase().auth, email, password);
export const signOut = () => fbSignOut(getFirebase().auth);
export const getIdToken = () => getFirebase().auth.currentUser?.getIdToken();

export async function getProfile(uid) {
  const snap = await getDoc(doc(getFirebase().db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export const watchAll = (name, cb, onError) =>
  onSnapshot(collection(getFirebase().db, name), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);

export async function add(name, data) {
  const ref = await addDoc(collection(getFirebase().db, name), stamp(data));
  return ref.id;
}

export const update = (name, id, patch) => updateDoc(doc(getFirebase().db, name, id), stamp(patch));
export const set = (name, id, data) => setDoc(doc(getFirebase().db, name, id), stamp(data));
