/**
 * Parse DATABASE_URL and extract connection parameters
 * Handles cases where password might not be properly parsed
 */
export function parseDatabaseUrl(url?: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
} | null {
  if (!url) {
    return null;
  }

  try {
    // First, try using URL constructor which handles encoding better
    try {
      // Replace postgres:// with http:// temporarily for URL parsing
      const httpUrl = url.replace(/^postgres(ql)?:\/\//, 'http://');
      const urlObj = new URL(httpUrl);
      
      // Extract database name from pathname (remove leading slash)
      const database = urlObj.pathname.replace(/^\//, '') || urlObj.pathname.slice(1);
      
      // Extract port
      const port = urlObj.port ? parseInt(urlObj.port, 10) : 5432;
      
      // Extract username and password
      // urlObj.password can be empty string if password part exists but is empty
      // or undefined if password part doesn't exist - we need to handle both
      const rawPassword = urlObj.password !== undefined ? urlObj.password : '';
      const username = urlObj.username ? decodeURIComponent(urlObj.username) : '';
      const password = rawPassword ? decodeURIComponent(rawPassword) : '';
      
      if (urlObj.hostname && database) {
        return {
          host: urlObj.hostname,
          port: port,
          username: username,
          password: String(password || ''), // Always ensure it's a string, never undefined
          database: decodeURIComponent(database),
        };
      }
    } catch (urlError) {
      // If URL constructor fails, fall back to regex parsing
    }

    // Fallback to regex parsing for edge cases
    // Parse PostgreSQL URL: postgresql://username:password@host:port/database
    const urlPattern = /^postgres(ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(urlPattern);

    if (match) {
      const [, , username, password, host, port, database] = match;
      
      // Decode URL-encoded password and ensure it's a string
      let decodedPassword = '';
      try {
        decodedPassword = password ? decodeURIComponent(password) : '';
      } catch (e) {
        // If decode fails, use password as-is
        decodedPassword = password || '';
      }
      
      return {
        host: host.trim(),
        port: parseInt(port, 10),
        username: decodeURIComponent(username.trim()),
        password: String(decodedPassword), // Explicitly ensure it's a string
        database: decodeURIComponent(database.trim()),
      };
    }

    // Try alternative format without port
    const urlPatternNoPort = /^postgres(ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)$/;
    const matchNoPort = url.match(urlPatternNoPort);

    if (matchNoPort) {
      const [, , username, password, host, database] = matchNoPort;
      
      // Decode URL-encoded password and ensure it's a string
      let decodedPassword = '';
      try {
        decodedPassword = password ? decodeURIComponent(password) : '';
      } catch (e) {
        decodedPassword = password || '';
      }
      
      return {
        host: host.trim(),
        port: 5432, // Default PostgreSQL port
        username: decodeURIComponent(username.trim()),
        password: String(decodedPassword), // Explicitly ensure it's a string
        database: decodeURIComponent(database.trim()),
      };
    }

    // Try format without password: postgresql://username@host:port/database
    const urlPatternNoPassword = /^postgres(ql)?:\/\/([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const matchNoPassword = url.match(urlPatternNoPassword);

    if (matchNoPassword) {
      const [, , username, host, port, database] = matchNoPassword;
      
      return {
        host: host.trim(),
        port: parseInt(port, 10),
        username: decodeURIComponent(username.trim()),
        password: '', // No password provided
        database: decodeURIComponent(database.trim()),
      };
    }

    // Try format without password and without port
    const urlPatternNoPasswordNoPort = /^postgres(ql)?:\/\/([^@]+)@([^/]+)\/(.+)$/;
    const matchNoPasswordNoPort = url.match(urlPatternNoPasswordNoPort);

    if (matchNoPasswordNoPort) {
      const [, , username, host, database] = matchNoPasswordNoPort;
      
      return {
        host: host.trim(),
        port: 5432, // Default PostgreSQL port
        username: decodeURIComponent(username.trim()),
        password: '', // No password provided
        database: decodeURIComponent(database.trim()),
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

/**
 * Normalize and validate database config to ensure password is always a string
 */
function normalizeConfig(config: {
  type: 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
}): {
  type: 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
} {
  // Create a new object to avoid mutating the original
  const normalized: any = {
    type: config.type,
  };
  
  // Copy all properties
  if (config.host) normalized.host = config.host;
  if (config.port !== undefined) normalized.port = config.port;
  if (config.username !== undefined) normalized.username = config.username;
  if (config.database) normalized.database = config.database;
  
  // CRITICAL: Ensure password is ALWAYS a string, never undefined or null
  // Even if password is empty, it must be an empty string, not undefined
  // This is critical for PostgreSQL SCRAM authentication
  if (config.password === undefined || config.password === null) {
    normalized.password = '';
  } else {
    normalized.password = String(config.password);
  }
  
  // Double-check: ensure it's never undefined
  if (normalized.password === undefined || normalized.password === null) {
    normalized.password = '';
  }
  
  // Debug: Log password normalization
  if (process.env.NODE_ENV !== 'production') {
    console.log('[normalizeConfig] Input password type:', typeof config.password);
    console.log('[normalizeConfig] Input password value:', config.password !== undefined ? '(set)' : '(undefined)');
    console.log('[normalizeConfig] Output password type:', typeof normalized.password);
    console.log('[normalizeConfig] Output password is string:', typeof normalized.password === 'string');
    console.log('[normalizeConfig] Output password value:', normalized.password ? '(set)' : '(empty string)');
  }
  
  // If we have individual components, don't include url to avoid conflicts
  // TypeORM will use individual components if both are present, but url takes precedence
  // So we remove url to ensure individual components (with normalized password) are used
  if (normalized.host && normalized.database) {
    // Don't include url - use individual components
    delete normalized.url;
  } else if (config.url) {
    normalized.url = config.url;
  }
  
  // Final validation: ensure password is always present as string
  if (!('password' in normalized) || normalized.password === undefined || normalized.password === null) {
    normalized.password = '';
  }
  normalized.password = String(normalized.password);
  
  return normalized;
}

/**
 * Get TypeORM connection options from environment variables
 * Falls back to individual DB_* variables if DATABASE_URL is not available
 */
export function getDatabaseConfig(): {
  type: 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  url?: string;
} {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    
    if (parsed) {
      // Use parsed components to ensure password is always a string
      // Ensure password is never undefined or null - use empty string as fallback
      const password = parsed.password !== undefined && parsed.password !== null 
        ? String(parsed.password) 
        : '';
      
      // Double-check all required fields are present
      if (!parsed.host || !parsed.database) {
        throw new Error('Parsed DATABASE_URL is missing required fields (host or database)');
      }
      
      const config = normalizeConfig({
        type: 'postgres' as const,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username || '',
        password: password, // Already ensured to be string
        database: parsed.database,
      });
      
      // Debug logging (remove in production if needed)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DB Config] Using parsed DATABASE_URL');
        console.log('[DB Config] Host:', config.host);
        console.log('[DB Config] Port:', config.port);
        console.log('[DB Config] Username:', config.username);
        console.log('[DB Config] Password type:', typeof config.password);
        console.log('[DB Config] Password is string:', typeof config.password === 'string');
        console.log('[DB Config] Password length:', config.password?.length || 0);
        console.log('[DB Config] Database:', config.database);
      }
      
      return config;
    } else {
      // If parsing fails, try to extract password manually or use individual vars
      console.warn('Failed to parse DATABASE_URL, attempting manual extraction');
      
      // Try to extract password from URL manually using the same method as parseDatabaseUrl
      try {
        // Replace postgres:// with http:// temporarily for URL parsing
        const httpUrl = databaseUrl.replace(/^postgres(ql)?:\/\//, 'http://');
        const urlObj = new URL(httpUrl);
        const rawPassword = urlObj.password !== undefined ? urlObj.password : '';
        const password = rawPassword ? decodeURIComponent(rawPassword) : '';
        const database = urlObj.pathname.replace(/^\//, '') || urlObj.pathname.slice(1);
        
        // If we can extract components, use them
        if (urlObj.hostname && database) {
          const config = normalizeConfig({
            type: 'postgres' as const,
            host: urlObj.hostname,
            port: urlObj.port ? parseInt(urlObj.port, 10) : 5432,
            username: urlObj.username ? decodeURIComponent(urlObj.username) : '',
            password: String(password || ''), // Ensure it's a string, never undefined
            database: decodeURIComponent(database),
          });
          
          // Debug logging
          if (process.env.NODE_ENV !== 'production') {
            console.log('[DB Config] Using manually extracted components from DATABASE_URL');
            console.log('[DB Config] Password type:', typeof config.password);
            console.log('[DB Config] Password is string:', typeof config.password === 'string');
          }
          
          return config;
        }
      } catch (e) {
        // If URL parsing fails, fall through to individual vars
        console.warn('Manual URL extraction also failed:', e.message);
      }
      
      // Last resort: use individual environment variables if available
      if (process.env.DB_HOST || process.env.DB_USERNAME) {
        console.warn('DATABASE_URL parsing failed, using individual DB_* variables');
        return normalizeConfig({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'username',
          password: String(process.env.DB_PASSWORD || ''), // Ensure it's a string
          database: process.env.DB_DATABASE || 'database_name',
        });
      }
      
      // If we can't parse and no individual vars, throw error
      throw new Error(
        'Failed to parse DATABASE_URL and no individual DB_* variables found. ' +
        'Please either fix DATABASE_URL format or set DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE'
      );
    }
  }

  // Fallback to individual environment variables
  const rawConfig = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'username',
    password: String(process.env.DB_PASSWORD || ''), // Ensure it's always a string
    database: process.env.DB_DATABASE || 'database_name',
  };
  
  const config = normalizeConfig(rawConfig);
  
  // Debug logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DB Config] Using individual DB_* variables');
    console.log('[DB Config] Raw password from env:', process.env.DB_PASSWORD ? '(set)' : '(not set)');
    console.log('[DB Config] Raw password type:', typeof process.env.DB_PASSWORD);
    console.log('[DB Config] Normalized password type:', typeof config.password);
    console.log('[DB Config] Normalized password is string:', typeof config.password === 'string');
    console.log('[DB Config] Final config keys:', Object.keys(config));
    console.log('[DB Config] Final config has password:', 'password' in config);
  }
  
  // Final safety check before returning
  if (!config.password || typeof config.password !== 'string') {
    console.error('[DB Config] ERROR: Password is not a string!', {
      password: config.password,
      type: typeof config.password,
    });
    config.password = '';
  }
  
  return config;
}

