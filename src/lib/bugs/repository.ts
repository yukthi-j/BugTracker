import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { getFirestoreDb } from "@/lib/firebase/client";
import { mapSnapshotToBug } from "@/lib/bugs/mapper";
import { sortBugsDeterministic } from "@/lib/bugs/sort";
import { canTransitionStatus } from "@/lib/bugs/transitions";
import type { Bug, BugStatus, CreateBugInput, UpdateBugInput } from "@/types/bug";

const BUGS_COLLECTION = "bugs";

function bugsCollectionRef() {
  return collection(getFirestoreDb(), BUGS_COLLECTION);
}

function bugDocRef(id: string) {
  return doc(getFirestoreDb(), BUGS_COLLECTION, id);
}

function normalizeCreateInput(input: CreateBugInput): Omit<DocumentData, "id"> {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    status: "new",
    priority: input.priority,
    tags: input.tags ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function normalizeUpdateInput(input: UpdateBugInput): DocumentData {
  const patch: DocumentData = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.title === "string") {
    patch.title = input.title.trim();
  }

  if (typeof input.description === "string") {
    patch.description = input.description.trim();
  }

  if (input.priority) {
    patch.priority = input.priority;
  }

  if (Array.isArray(input.tags)) {
    patch.tags = input.tags;
  }

  return patch;
}

async function getBugOrThrow(id: string): Promise<Bug> {
  const snapshot = await getDoc(bugDocRef(id));

  if (!snapshot.exists()) {
    throw new Error(`Bug with id ${id} was not found.`);
  }

  return mapSnapshotToBug(snapshot);
}

export async function createBug(input: CreateBugInput): Promise<Bug> {
  if (!input.title.trim()) {
    throw new Error("Title is required.");
  }

  const createdRef = await addDoc(bugsCollectionRef(), normalizeCreateInput(input));
  return getBugOrThrow(createdRef.id);
}

export async function listBugs(): Promise<Bug[]> {
  const snapshot = await getDocs(bugsCollectionRef());
  const bugs = snapshot.docs.map((docSnapshot) => mapSnapshotToBug(docSnapshot));
  return sortBugsDeterministic(bugs);
}

export async function listBugsByStatus(status: BugStatus): Promise<Bug[]> {
  const bugs = await listBugs();
  return bugs.filter((bug) => bug.status === status);
}

export async function updateBug(id: string, patch: UpdateBugInput): Promise<Bug> {
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new Error("Title cannot be empty.");
  }

  await updateDoc(bugDocRef(id), normalizeUpdateInput(patch));
  return getBugOrThrow(id);
}

export async function transitionStatus(id: string, nextStatus: BugStatus, comment = ""): Promise<Bug> {
  const current = await getBugOrThrow(id);

  if (!canTransitionStatus(current.status, nextStatus)) {
    throw new Error(`Invalid status transition: ${current.status} -> ${nextStatus}`);
  }

  await updateDoc(bugDocRef(id), {
    status: nextStatus,
    updatedAt: serverTimestamp(),
    statusLog: arrayUnion({
      fromStatus: current.status,
      toStatus: nextStatus,
      comment: comment.trim(),
      timestamp: new Date(),
    }),
  });

  return getBugOrThrow(id);
}

export async function deleteBug(id: string): Promise<void> {
  await deleteDoc(bugDocRef(id));
}
