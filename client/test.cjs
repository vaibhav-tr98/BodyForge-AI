const axios = require("axios");

async function test() {
  try {
    // We need a user to login first
    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email: "vaibhav.test@example.com",
      password: "password123"
    });
    const token = res.data.data.token;
    console.log("Got token!");
    
    try {
      const dash = await axios.get("http://localhost:5000/api/analytics/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Dashboard Success:", dash.data);
    } catch(err) {
      console.log("Dashboard Error:", err.response ? err.response.data : err.message);
    }

  } catch(err) {
    console.log("Login Error:", err.response ? err.response.data : err.message);
  }
}
test();
