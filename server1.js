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

// Fetch students
app.get("/students", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("SELECT * FROM student1");
    res.json(
      result.rows.map((row) => ({
        regno: row[0],
        sname: row[1],
        admin_type: row[2],
        verified: row[3],
      }))
    );
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Fetch lateral records
app.get("/lateral", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("SELECT * FROM lateral1");
    res.json(
      result.rows.map((row) => ({
        regno: row[0],
        verified: row[1],
      }))
    );
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Add student with cursor logic
app.post("/add-student", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { regno, sname } = req.body;
    if (!regno || !sname)
      return res.status(400).json({ message: "❌ All fields are required!" });

    // Using PL/SQL block with cursor logic
    await connection.execute(
      `DECLARE 
         CURSOR c1 IS SELECT regno FROM student1 WHERE regno = :regno; 
       BEGIN 
         -- Insert the new student into student1
         INSERT INTO student1 (regno, sname) VALUES (:regno, :sname);
    
         -- Cursor loop to update admin_type and verified field
         FOR r IN c1 LOOP 
           -- Set admin_type to 'L' for lateral students (20235033, 20235037)
           -- Set admin_type to 'R' for students whose regno starts with 20235030
           -- Set admin_type to 'S' for other students
           UPDATE student1 SET admin_type = CASE 
                                               WHEN TO_CHAR(regno) LIKE '20235033%' OR TO_CHAR(regno) LIKE '20235037%' THEN 'L' 
                                               WHEN TO_CHAR(regno) LIKE '20235030%' THEN 'R'
                                               ELSE 'S' 
                                             END 
           WHERE regno = r.regno;
           
           -- Set verified to 'yes' only for lateral students
           UPDATE student1 SET verified = 'yes' 
           WHERE TO_CHAR(regno) LIKE '20235033%' OR TO_CHAR(regno) LIKE '20235037%';
         END LOOP;
       END;`,
      { regno, sname },
      { autoCommit: true }
    );

    res.json({ message: `✅ Student ${sname} added successfully!` });
  } catch (err) {
    res.status(500).json({ message: "❌ Database error!", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Update student
app.put("/update-student", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { regno, sname } = req.body;
    await connection.execute(
      "UPDATE student1 SET sname = :sname WHERE regno = :regno",
      [sname, regno],
      { autoCommit: true }
    );
    res.json({ message: "✅ Student updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "❌ Database error!", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Delete student
app.delete("/delete-student", async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { regno } = req.body;
    await connection.execute(
      "DELETE FROM student1 WHERE regno = :regno",
      [regno],
      { autoCommit: true }
    );
    res.json({ message: "✅ Student deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: "❌ Database error!", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// Start the server
app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
