// One auth/data interface with two implementations:
//  - firebase: real Firebase Auth + Firestore (when VITE_FIREBASE_API_KEY is set)
//  - demo:     self-contained sample data kept in this browser (no setup needed)
// watch* callbacks receive plain objects: { id, ...data }. Timestamps passed
// as the string 'now' become server timestamps.
import * as demo from './demo';
import * as firebase from './firebase';

export const isDemo = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_DEMO_MODE === 'true';

const impl = isDemo ? demo : firebase;

export const { onAuth, signIn, signOut, getProfile, getIdToken, watchAll, add, update, set } = impl;
export const resetDemo = demo.resetDemo;
