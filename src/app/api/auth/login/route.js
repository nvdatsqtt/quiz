import client, { hashPassword, initDb } from "@/lib/turso";

export async function POST(request) {
  try {
    await initDb();
    
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Vui lòng nhập tên người dùng và mật khẩu." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const hashedPassword = hashPassword(password);

    const result = await client.execute({
      sql: `SELECT role FROM users WHERE username = ? AND password = ?`,
      args: [username, hashedPassword]
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
      return new Response(JSON.stringify({ 
        username,
        role: user.role
      }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("Login Error:", error);
    return new Response(JSON.stringify({ error: "Lỗi máy chủ nội bộ." }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
