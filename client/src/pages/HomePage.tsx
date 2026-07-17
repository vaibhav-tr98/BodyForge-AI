import { useEffect, useState } from "react";
import api from "../api/axios";

function HomePage() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    console.log("HomePage mounted");

    api
      .get("/")
      .then((res) => {
        console.log("Response:", res.data);
        setMessage(res.data.message);
      })
      .catch((err) => {
        console.error("Axios Error:", err);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-white">
      <h1 className="text-5xl font-bold text-cyan-400">
        BodyForge AI 🚀
      </h1>

      <p className="mt-6 text-xl">{message}</p>
    </div>
  );
}

export default HomePage;