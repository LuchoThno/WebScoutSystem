/**
 * Supabase Client Singleton
 * Provides a centralized client instance for Supabase interactions
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize the Supabase client
     * @returns {Promise<Object>} The Supabase client instance
     */
    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            try {
                // Get Supabase credentials from environment variables
                const supabaseUrl = 'https://swkdhtjpykqdislgqssd.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3a2RodGpweWtxZGlzbGdxc3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQxOTcsImV4cCI6MjA2NTM0MDE5N30.4YeMQVZsPwNUqef54Ww-IFOwjBwHUN0ox49Bu5dQqbs';

                if (!supabaseUrl || !supabaseKey) {
                    console.warn('Supabase credentials not found');
                    this.initialized = false;
                    resolve(null);
                    return;
                }

                // Check if supabase is available on the global window object
                if (typeof window.supabase === 'undefined') {
                    console.error('Supabase client library not loaded');
                    this.initialized = false;
                    resolve(null);
                    return;
                }

                this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
                this.initialized = true;
                console.log('Supabase client initialized');
                resolve(this.client);
            } catch (error) {
                console.error('Error initializing Supabase client:', error);
                this.initialized = false;
                reject(error);
            }
        });

        return this.initPromise;
    }

    /**
     * Get the Supabase client instance
     * @returns {Object|null} The Supabase client instance or null if not initialized
     */
    getClient() {
        if (!this.initialized) {
            console.warn('Supabase client not initialized. Call init() first.');
            return null;
        }
        return this.client;
    }

    /**
     * Check if the client is initialized
     * @returns {boolean} True if initialized, false otherwise
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get a table reference
     * @param {string} tableName - The name of the table
     * @returns {Object} The table reference
     */
    table(tableName) {
        if (!this.initialized) {
            console.warn('Supabase client not initialized. Call init() first.');
            return null;
        }
        return this.client.from(tableName);
    }

    /**
     * Fetch all records from a table
     * @param {string} tableName - The name of the table
     * @param {Object} options - Query options
     * @returns {Promise<Array>} The fetched records
     */
    async fetchAll(tableName, options = {}) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            let query = this.client.from(tableName).select(options.select || '*');

            // Apply filters if provided
            if (options.filters) {
                for (const [column, value] of Object.entries(options.filters)) {
                    query = query.eq(column, value);
                }
            }

            // Apply order if provided
            if (options.order) {
                const { column, ascending = true } = options.order;
                query = query.order(column, { ascending });
            }

            // Apply pagination if provided
            if (options.pagination) {
                const { page = 0, pageSize = 20 } = options.pagination;
                query = query.range(page * pageSize, (page + 1) * pageSize - 1);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching data from ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Insert a record into a table
     * @param {string} tableName - The name of the table
     * @param {Object|Array} records - The record(s) to insert
     * @returns {Promise<Object>} The inserted record(s)
     */
    async insert(tableName, records) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            const { data, error } = await this.client
                .from(tableName)
                .insert(records);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error inserting data into ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Update a record in a table
     * @param {string} tableName - The name of the table
     * @param {Object} record - The record to update
     * @param {Object} conditions - The conditions to match
     * @returns {Promise<Object>} The updated record
     */
    async update(tableName, record, conditions) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            let query = this.client.from(tableName).update(record);

            // Apply conditions
            for (const [column, value] of Object.entries(conditions)) {
                query = query.eq(column, value);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error updating data in ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Delete a record from a table
     * @param {string} tableName - The name of the table
     * @param {Object} conditions - The conditions to match
     * @returns {Promise<Object>} The deleted record
     */
    async delete(tableName, conditions) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            let query = this.client.from(tableName).delete();

            // Apply conditions
            for (const [column, value] of Object.entries(conditions)) {
                query = query.eq(column, value);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error deleting data from ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Fetch a single record from a table
     * @param {string} tableName - The name of the table
     * @param {Object} conditions - The conditions to match
     * @returns {Promise<Object>} The fetched record
     */
    async fetchOne(tableName, conditions) {
        if (!this.initialized) {
            await this.init();
        }

        try {
            let query = this.client.from(tableName).select('*');

            // Apply conditions
            for (const [column, value] of Object.entries(conditions)) {
                query = query.eq(column, value);
            }

            const { data, error } = await query.single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching data from ${tableName}:`, error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const supabaseClientInstance = new SupabaseClient();

// Export for module systems
export default supabaseClientInstance;