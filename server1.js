const express = require("express");
const oracledb = require("oracledb");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
  user: "system",
  password: "root",
  connectString: "localhost:1521/XE",
};

app.get("/", (req, res) => {
  res.send("Welcome to the Student Admission API!");
});

app.post("/add-student", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { regno, sname } = req.body;

    if (!regno || !sname) {
      return res.status(400).json({ message: "❌ All fields are required!" });
    }

    // Insert into student1
    await connection.execute(
      "INSERT INTO student1 (regno, sname) VALUES (:regno, :sname)",
      [regno, sname],
      { autoCommit: false }
    );

    // Execute cursor logic to update admin_type and verified
    await connection.execute(
      `DECLARE
         CURSOR c1 IS SELECT regno FROM student1; 
       BEGIN
         FOR r IN c1 LOOP
           IF TO_CHAR(r.regno) LIKE '20235035%' THEN
             UPDATE student1 SET admin_type = 'S' WHERE regno = r.regno;
           ELSIF TO_CHAR(r.regno) LIKE '20235030%' THEN
             UPDATE student1 SET admin_type = 'R' WHERE regno = r.regno;
           ELSIF TO_CHAR(r.regno) LIKE '20235037%' OR TO_CHAR(r.regno) LIKE '20235033%' THEN
             UPDATE student1 SET admin_type = 'L', verified = 'yes' WHERE regno = r.regno;
           END IF;
         END LOOP;
         COMMIT;
       END;`
    );

    // Commit transaction
    await connection.commit();

    // Check if trigger inserted into lateral1
    const result = await connection.execute(
      "SELECT * FROM lateral1 WHERE regno = :regno",
      [regno]
    );

    let message = `✅ Student ${sname} (Reg No: ${regno}) added successfully!`;
    if (result.rows.length > 0) {
      message += " \n Trigger executed: Record added to lateral1.";
    }

    res.status(200).json({ message });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "❌ Database error!", error: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
