import qrcode
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Backend verification base URL from environment variable
BASE_URL = os.getenv("BASE_URL")



# Ensure 'qrcodes' directory exists
if not os.path.exists("qrcodes"):
    os.makedirs("qrcodes")

# Database connection setup
def get_db_connection():
    client = MongoClient(os.getenv("MONGODB_URI"))  # Use environment variable

    return client['attendance_system']  # Return the database

# Generate QR code and insert data into the database
def generate_and_store_qr(student_name, student_id):
    # Generate unique QR code URL
    qr_code_url = f"{BASE_URL}{student_id}"  # Store the full verification URL in the QR code
    
    # Generate QR code and save as an image
    qr = qrcode.make(qr_code_url)
    qr.save(f"qrcodes/{student_id}.png")  # Save QR code as a PNG file
    
    # Insert student details into the database
    db = get_db_connection()
    students_collection = db['students']  # Access the students collection
    student_data = {
        "name": student_name,
        "student_id": student_id,
        "qr_code": qr_code_url
    }
    try:
        students_collection.insert_one(student_data)  # Insert the student data
        print(f"Successfully added {student_name} with QR Code URL: {qr_code_url}")
    except Exception as e:
        print(f"Error inserting data: {e}")

# Function to verify if a student exists in the database
def verify_student(student_id):
    db = get_db_connection()
    students_collection = db['students']  # Access the students collection
    try:
        student = students_collection.find_one({"student_id": student_id})
        if student:
            return {"message": "Student found", "name": student['name']}  # Return structured response
        else:
            return {"message": "Student not found."}  # Return structured response
    except Exception as e:
        return {"message": "Error querying data", "error": str(e)}

# Example student data
students = [
    {"name": "Abhishek P Shaji", "student_id": "HKC22CS001"},
    {"name": "Absher KC", "student_id": "HKC22CS002"},
    {"name": "Agnes CA", "student_id": "HKC22CS003"},
    {"name": "Alen Peter", "student_id": "HKC22CS004"},
    {"name": "Anagha Mohan", "student_id": "HKC22CS005"},
    {"name": "Ann Mary Binoy", "student_id": "HKC22CS006"},
    {"name": "Antony James", "student_id": "HKC22CS008"},
    {"name": "Aravind K A", "student_id": "HKC22CS009"},
    {"name": "Arjun Pradeep", "student_id": "HKC22CS010"},
    {"name": "Atheetha Anoop", "student_id": "HKC22CS011"},
    {"name": "A V Avandhika", "student_id": "HKC22CS012"},
    {"name": "Benyamin Eldho", "student_id": "HKC22CS013"},
    {"name": "Blesson Kuriakose", "student_id": "HKC22CS014"},
    {"name": "Dinil Dev", "student_id": "HKC22CS015"},
    {"name": "Edwin Shaji", "student_id": "HKC22CS016"},
    {"name": "Fenil Sonilal", "student_id": "HKC22CS018"},
    {"name": "Gamil Jacob", "student_id": "HKC22CS019"},
    {"name": "Issac Baby", "student_id": "HKC22CS020"},
    {"name": "Jerin Joy", "student_id": "HKC22CS021"},
    {"name": "Joyal Thomas", "student_id": "HKC22CS022"},
    {"name": "Mathew Elisha Thomas", "student_id": "HKC22CS023"},
    {"name": "Mereena James", "student_id": "HKC22CS024"},
    {"name": "Muhammed Midulaj", "student_id": "HKC22CS026"},
    {"name": "Nandana Ajai", "student_id": "HKC22CS028"},
    {"name": "Nethan M Shaji", "student_id": "HKC22CS029"},
    {"name": "Pavitra M", "student_id": "HKC22CS030"},
    {"name": "Sallal K S", "student_id": "HKC22CS031"},
    {"name": "Sanal Saju", "student_id": "HKC22CS032"},
    {"name": "Sandra Chandran", "student_id": "HKC22CS034"},
    {"name": "Sonamol C M", "student_id": "HKC22CS036"},
    {"name": "Vismaya K", "student_id": "HKC22CS037"},
    {"name": "Amitha Bhaskaran", "student_id": "HKC22CS038"},
    {"name": "Hana K S", "student_id": "HKC22CS039"},
    {"name": "Nandhana K P", "student_id": "HKC22CS040"},
    {"name": "Abhinandh Haridas", "student_id": "HKC22CE001"},
    {"name": "Adhila Sherin", "student_id": "HKC22CE002"},
    {"name": "Anex Benny", "student_id": "HKC22CE004"},
    {"name": "Anju Maria George", "student_id": "HKC22CE005"},
    {"name": "Arya Devan", "student_id": "HKC22CE007"},
    {"name": "Lumina Bishri", "student_id": "HKC22CE008"},
    {"name": "Sanila A V", "student_id": "HKC22CE010"},
    {"name": "Sreepath Sudarshan", "student_id": "HKC22CE011"},
    {"name": "Ananda Krishnan P R", "student_id": "HKC22CE012"},
    {"name": "Sanika C S", "student_id": "HKC22CE013"},
    

]

# Generate QR codes and insert each student into the database
for student in students:
    generate_and_store_qr(student["name"], student["student_id"])
