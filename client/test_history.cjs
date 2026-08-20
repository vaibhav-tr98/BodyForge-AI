const axios = require("axios");

async function test() {
  try {
    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email: "vaibhavtripathi99a@gmail.com",
      password: "password123"
    });
    const token = res.data.data.token;
    console.log("Got token for user with history!");
    
    const dash = await axios.get("http://localhost:5000/api/analytics/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Dashboard Success:", dash.data.data.summary);
  } catch(err) {
    console.log("Dashboard Error:", err.response ? err.response.data : err.message);
  }
}
test();
