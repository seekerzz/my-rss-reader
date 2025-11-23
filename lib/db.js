import { Pool } from 'pg';

let pool;

// 判断是否是远程数据库（Railway 的地址通常包含 rlwy.net）
const isRemoteDB = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('rlwy.net');

if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // 关键修改：如果是远程数据库，无论是在本地开发还是生产环境，都强制开启 SSL
    // rejectUnauthorized: false 允许连接自签名证书，避免 Windows 下的证书报错
    ssl: isRemoteDB ? { rejectUnauthorized: false } : false,
  });
}

pool = global.pgPool;

export default pool;