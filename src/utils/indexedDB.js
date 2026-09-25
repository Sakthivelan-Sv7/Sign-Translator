const DB_NAME = 'SignBridgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'samples';

let dbInstance = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('signLabel', 'signLabel', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB init error:', event.target.error);
      reject(event.target.error);
    };
  });
};

export const saveSample = async (sample) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(sample);

    request.onsuccess = () => resolve(sample.id);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const getAllSamples = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const getSampleCounts = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const allSamples = request.result;
      const counts = {};
      allSamples.forEach(sample => {
        counts[sample.signLabel] = (counts[sample.signLabel] || 0) + 1;
      });
      resolve(counts);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};
