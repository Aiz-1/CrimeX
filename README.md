CrimeX
Smart Crime Investigation & Case Management System
A full-stack web application for managing crime cases, suspects, victims, evidence, and officers — built with Vanilla JavaScript and powered by Supabase PostgreSQL.

Live Demo
https://crime-x.vercel.app/

Features
Case Management

File new crime cases with title, status, and assigned officer
Link crimes, suspects, and victims directly to a case
Filter cases by status — Open, Under Review, Closed
Edit and delete cases with automatic cascade cleanup

Crime Tracking

Record individual crime incidents with type, date, and location
Link crimes to cases via a junction table
Full edit and delete support

Suspect Management

Add suspect profiles with name, DOB, gender, phone, and address
Automatically detect and reuse existing suspects by name/phone
Link suspects to multiple cases with a role (e.g. Primary, Witness)
View how many cases each suspect is linked to

‍ Victim Management

Record victim profiles and link them to cases
Duplicate detection by name and contact
Full edit support

Evidence Logging

Log evidence by type, date collected, and linked case
Edit and reassign evidence to different cases
Automatic case status update trigger on new evidence (via Supabase trigger)

Officer Management

Register officers with rank, badge number, and department
Assign officers to cases
Department seeding on first load

Location Management

Add crime scene locations with address, city, district, and postal code
Reuse locations across multiple crimes
Inline new location creation inside crime and case forms

Dashboard & Analytics

Live KPI stats — Total Cases, Open Cases, Suspects, Crimes, Evidence, Officers
Doughnut chart — Case status distribution
Bar chart — Crime type frequency
Recent cases table with officer assignment

Reports

Run built-in database views as instant reports
Dynamic table rendering from any Supabase view

User Management (Admin Only)

Create new users with email, password, and role
Duplicate email detection — same email cannot be registered twice
Role assignment — admin or viewer
Delete users with safety checks:
Cannot delete your own account
Cannot delete the last admin

Authentication & Roles

Email/password login via Supabase Auth
Role-based UI — admins see all controls, viewers get read-only access
Session persistence — stay logged in on page refresh
Secure logout


Tech Stack
LayerTechnologyFrontendHTML5, CSS3, Vanilla JavaScriptBackend / DatabaseSupabase (PostgreSQL)AuthenticationSupabase AuthChartsChart.jsServer-side LogicSupabase Edge Functions (Deno)DeploymentVercel

Database Schema
profiles — User accounts and roles
cases — Crime case records
crimes — Individual crime incidents
suspects — Suspect profiles
victims — Victim profiles
evidence — Evidence items
officers — Law enforcement officers
departments — Officer departments
locations — Crime scene locations
case_crimes — Junction: cases crimes
case_suspects — Junction: cases suspects
case_victims — Junction: cases victims

Getting Started
Prerequisites

A Supabase account
A Vercel account
Git installed on your machine

1. Clone the Repository
bashgit clone https://github.com/your-username/crimex.git
cd crimex

3. Set Up Supabase

Create a new project on supabase.com
Run the SQL schema (see schema.sql if included) in the Supabase SQL Editor
Enable Row Level Security (RLS) on all tables
Go to Project Settings → API and copy your:

3. Configure the App
Open supabase.js and replace the values:
jsconst SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

Project Structure
crimex/
 index.html — Main HTML shell, all pages and modals
 style.css — Full dark theme styling
 supabase.js — Supabase client initialization
 auth.js — Login, logout, session, role management
 ui.js — Navigation, modals, toast, role visibility
 app.js — All data operations (CRUD for every module)
 README.md
