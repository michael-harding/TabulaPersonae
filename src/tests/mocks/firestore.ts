import type { DocumentReference, DocumentSnapshot, QuerySnapshot } from "firebase/firestore"

interface FakeDoc {
  id: string
  data: () => object
}

// Firestore's snapshot and reference classes cannot be built or structurally typed by a test: their constructors
// are SDK-internal, `exists()` is declared as a type predicate (`this is QueryDocumentSnapshot`),
// and `forEach` hands its callback a `QueryDocumentSnapshot`. A plain object can only stand in for
// one through an assertion, so that assertion is made exactly once, here, and every test goes
// through the builders below. Each fake implements exactly the members
// `src/lib/firebase-storage.ts` reads.
function asFirestoreObject<T extends DocumentSnapshot | QuerySnapshot | DocumentReference>(fake: object): T {
  return fake as unknown as T
}

export function makeDocSnap(exists: boolean, data?: object): DocumentSnapshot {
  const fake = {
    exists: () => exists,
    id: "char-1",
    data: () => data ?? {},
  }
  return asFirestoreObject<DocumentSnapshot>(fake)
}

export function makeQuerySnapshot(docs: FakeDoc[]): QuerySnapshot {
  const fake = {
    forEach: (cb: (doc: FakeDoc) => void) => docs.forEach(cb),
  }
  return asFirestoreObject<QuerySnapshot>(fake)
}

/** A document snapshot as delivered to an `onSnapshot` listener, with sync metadata. */
export function makeListenerSnap(userId: string, hasPendingWrites: boolean, updatedAtMs: number | null): DocumentSnapshot {
  const fake = {
    exists: () => true,
    id: "char-1",
    data: () => ({
      userId,
      // null: a document that has never been stamped with an update time
      updatedAt: updatedAtMs != null ? { seconds: updatedAtMs / 1000, nanoseconds: 0 } : null,
    }),
    metadata: { hasPendingWrites },
  }
  return asFirestoreObject<DocumentSnapshot>(fake)
}

/** A listener snapshot whose existence and raw data the test chooses, e.g. a missing document. */
export function makeRawListenerSnap(exists: boolean, data: object, hasPendingWrites = false): DocumentSnapshot {
  const fake = {
    exists: () => exists,
    id: "char-1",
    data: () => data,
    metadata: { hasPendingWrites },
  }
  return asFirestoreObject<DocumentSnapshot>(fake)
}

/** The reference `addDoc` resolves with, carrying the id Firestore generated for the new document. */
export function makeDocRef(id: string): DocumentReference {
  return asFirestoreObject<DocumentReference>({ id })
}
