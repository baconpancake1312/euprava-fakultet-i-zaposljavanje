# euprava - E-Government Services Platform

A comprehensive full-stack e-government application integrating university and employment services with role-based access control.

## Features

### Authentication System
- User registration and login
- JWT token-based authentication
- Role-based access control (Student, Professor, Employer, Candidate, Admin)
- Secure logout functionality

### University Services
- **Students**: Profile management, course enrollment, exam registration, academic tracking
- **Professors**: Course management, exam scheduling, student oversight, grade entry
- **Administrators**: Student/professor management, department oversight, notification system
- **Courses**: Full CRUD operations, prerequisites, schedules
- **Exams**: Registration, calendar, management
- **Departments**: Organization structure management
- **Internships**: Application and tracking system

### Employment Services
- **Employers**: Company profile management, job listing creation, application review
- **Candidates**: CV upload, skill management, job search, application tracking
- **Job Listings**: Create, approve, and manage job postings
- **Applications**: Apply to jobs, track application status
- **Internships**: Post and apply for internship positions

### Admin Features
- Approve employer registrations
- Approve job listings
- Manage university entities (students, professors, departments)
- Send system notifications

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **State Management**: React Context API
- **API Integration**: RESTful APIs with fetch
- **Authentication**: JWT tokens with localStorage persistence

## Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`env
NEXT_PUBLIC_AUTH_API_URL=http://localhost:8080
NEXT_PUBLIC_UNIVERSITY_API_URL=http://localhost:8088
NEXT_PUBLIC_EMPLOYMENT_API_URL=http://localhost:8089
\`\`\`

## API Endpoints

### Authentication Service (Port 8080)
- `POST /users/register` - Register new user
- `POST /users/login` - User login
- `POST /users/logout` - User logout

### University Service (Port 8088)
- Students: `/students/*`
- Professors: `/professors/*`
- Courses: `/courses/*`
- Departments: `/departments/*`
- Universities: `/universities/*`
- Exams: `/exams/*`
- Administrators: `/administrators/*`
- Assistants: `/assistants/*`
- Notifications: `/notifications/*`
- Internships: `/internship/*`

### Employment Service (Port 8089)
- Job Listings: `/job-listings/*`
- Applications: `/applications/*`
- Employers: `/employers/*`
- Candidates: `/candidates/*`
- Unemployed Records: `/unemployed-records/*`
- Documents: `/documents/*`

## User Roles & Permissions

### Student
- Complete academic profile
- View and enroll in courses
- Register for exams
- Track academic progress (GPA, ESPB)
- Apply for internships

### Professor
- Manage teaching courses
- Create and schedule exams
- View enrolled students
- Enter grades
- Manage office hours

### Employer
- Complete company profile (requires admin approval)
- Create job listings (requires admin approval)
- View applications
- Post internship opportunities

### Candidate
- Upload CV/Resume
- Manage skills
- Search and apply for jobs
- Track application status

### Admin (STUDENTSKA_SLUZBA)
- Manage all students and professors
- Approve employer registrations
- Approve job listings
- Manage departments and universities
- Send system notifications

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables (see above)

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

\`\`\`
├── app/
│   ├── dashboard/
│   │   ├── student/          # Student-specific pages
│   │   ├── professor/        # Professor-specific pages
│   │   ├── employer/         # Employer-specific pages
│   │   ├── candidate/        # Candidate-specific pages
│   │   └── admin/            # Admin-specific pages
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   └── page.tsx              # Landing page
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard-layout.tsx  # Dashboard wrapper
│   └── profile-completion-prompt.tsx
├── lib/
│   ├── api-client.ts         # API integration layer
│   ├── auth-context.tsx      # Authentication context
│   └── types.ts              # TypeScript types
└── README.md
\`\`\`

## Role-Based Routing

After login, users are automatically redirected to their role-specific dashboard:
- Students → `/dashboard/student`
- Professors → `/dashboard/professor`
- Employers → `/dashboard/employer`
- Candidates → `/dashboard/candidate`
- Admins → `/dashboard/admin`

## Profile Completion

Users are prompted to complete their role-specific profiles before accessing full features:
- **Students**: Major, year, GPA, ESPB credits
- **Employers**: Company details, PIB, registration number
- **Candidates**: CV upload, skills
- **Professors**: Office location, teaching subjects

## API Client

The `apiClient` provides a comprehensive interface for all backend services with:
- Automatic authentication header injection
- Error handling
- Type-safe method signatures
- Support for all CRUD operations across both services

## Contributing

This project integrates with existing Go backend services. Ensure your backend services are running on the specified ports before testing the frontend.

## About euprava

euprava (e-government) is a comprehensive platform designed to streamline government services for education and employment, providing a unified interface for students, professors, employers, and job candidates.
