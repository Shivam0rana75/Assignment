import express from "express";
import bodyParser from "body-parser";
import mysql from 'mysql2/promise'; 
const port = 3000;
import { getDistance } from 'geolib';

const app = express();

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'schoolDB'
});

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

function ValidateData({ name, address, latitude, longitude }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { valid: false, message: "Invalid School Name" };
  }
  if (!address || typeof address !== "string" || !address.trim()) {
    return { valid: false, message: "Invalid School Address" };
  }
  if (
    typeof latitude !== "number" || latitude == null || latitude < -90 || latitude > 90
  ) {
    return { valid: false, message: "Invalid latitude" };
  }

  if (
    typeof longitude !== "number" || longitude == null || longitude < -180 || longitude > 180
  ) {
    return { valid: false, message: "Invalid longitude" };
  }

  return { valid: true };
}

function isValidCoordinate(lat, lon) {
  const validLat = typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
  const validLon = typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180;
  return validLat && validLon;
}


app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  const CheckValidation = ValidateData({ name, address, latitude, longitude });
  if (!CheckValidation.valid) {
    return res.status(400).json({ error: CheckValidation.message });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
      [name, address, latitude, longitude]
    );

    res.status(201).json({ message: 'School added!', schoolId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});

app.get('/listSchools', async (req, res) => {
  const userLat = parseFloat(req.query.latitude);
  const userLon = parseFloat(req.query.longitude);

  if (!isValidCoordinate(userLat, userLon)) {
    return res.status(400).json({ error: 'Invalid latitude or longitude' });
  }

  try {
    const [schools] = await pool.query('SELECT * FROM schools');

    const schoolsWithDistance = schools.map((school) => {
      const distance = getDistance(
        { latitude: userLat, longitude: userLon },
        { latitude: school.latitude, longitude: school.longitude }
      );
      return { ...school, distance }; 
    });

    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    res.status(200).json(schoolsWithDistance);
  } catch (err) {
    console.error("Error fetching schools:", err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
