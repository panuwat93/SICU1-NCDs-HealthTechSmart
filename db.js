const DB_NAME = 'SICU1NCDsHealthTechDB';
const DB_VERSION = 1; 

const STORES = {
    USERS: 'users',
    HEALTH_INFO: 'health_info',
    BMI_RECORDS: 'bmi_records',
    CHANGE_LOG: 'change_log'
};

export class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        if (this.db) return;

        this.db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORES.USERS)) {
                    db.createObjectStore(STORES.USERS, { keyPath: 'username' });
                }
                if (!db.objectStoreNames.contains(STORES.HEALTH_INFO)) {
                    db.createObjectStore(STORES.HEALTH_INFO, { keyPath: 'username' });
                }
                if (!db.objectStoreNames.contains(STORES.BMI_RECORDS)) {
                    const bmiStore = db.createObjectStore(STORES.BMI_RECORDS, { autoIncrement: true });
                    bmiStore.createIndex('by_user_date', ['username', 'date'], { unique: true });
                }
                if (!db.objectStoreNames.contains(STORES.CHANGE_LOG)) {
                    const logStore = db.createObjectStore(STORES.CHANGE_LOG, { autoIncrement: true });
                    logStore.createIndex('by_user_date', ['username', 'date'], { unique: false });
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                console.error("Database error: ", event.target.error);
                reject(event.target.error);
            };
        });
    }

    async #getStore(storeName, mode) {
        await this.init();
        return this.db.transaction(storeName, mode).objectStore(storeName);
    }

    // User Methods
    async addUser(user) {
        const store = await this.#getStore(STORES.USERS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUser(username) {
        const store = await this.#getStore(STORES.USERS, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateUser(user) {
        const store = await this.#getStore(STORES.USERS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Health Info Methods
    async saveHealthInfo(healthInfo) {
        const store = await this.#getStore(STORES.HEALTH_INFO, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(healthInfo);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getHealthInfo(username) {
        const store = await this.#getStore(STORES.HEALTH_INFO, 'readonly');
        return new Promise((resolve, reject) => {
            const request = store.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // BMI Methods
    async addBmiRecord(record) {
        const store = await this.#getStore(STORES.BMI_RECORDS, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getBmiRecordForDate(username, date) {
        const store = await this.#getStore(STORES.BMI_RECORDS, 'readonly');
        const index = store.index('by_user_date');
        return new Promise((resolve, reject) => {
            const request = index.get([username, date]);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getLatestBmiRecord(username) {
        const store = await this.#getStore(STORES.BMI_RECORDS, 'readonly');
        const index = store.index('by_user_date');
        return new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.bound([username, ''], [username, '\uffff']), 'prev');
            request.onsuccess = (event) => {
                resolve(event.target.result ? event.target.result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // ChangeLog Methods
    async addChangeLogRecord(record) {
        const store = await this.#getStore(STORES.CHANGE_LOG, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllChangeLogRecords(username) {
        const store = await this.#getStore(STORES.CHANGE_LOG, 'readonly');
        const index = store.index('by_user_date');
        return new Promise((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.bound([username, ''], [username, '\uffff']));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
} 