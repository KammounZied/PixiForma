# PixiForma

**PixiForma** is a collaborative knowledge and training management platform designed for organizations. It enables trainers to organize and distribute knowledge through publications and structured training paths, while allowing collaborators to follow their assigned content and track their progress.

The platform also integrates AI-powered features for generating **document summaries and quizzes**, helping trainers facilitate knowledge sharing and assessment.

## ✨ Features

### 👤 User & Role Management

* User account management
* Role-based access control
* Three main roles:

  * **Administrator**
  * **Trainer**
  * **Collaborator**

### 👥 Groups Management

* Create and manage groups
* Organize collaborators within groups
* Associate trainers with groups
* Assign publications and training paths to specific groups

### 📄 Publications

* Create and manage publications
* Upload and consult PDF documents
* Define the visibility of publications for specific groups
* Organize knowledge into independent resources

### 🎓 Training Paths

* Create structured training paths
* Combine multiple publications into a single training
* Define the order of publications
* Assign training paths to specific groups
* Track collaborator progression
* Support different progression modes, including guided progression with quizzes

### 🤖 AI-Powered Summaries & Quizzes

* Generate summaries from uploaded PDF documents
* Generate quizzes based on document content
* Use quizzes to assess knowledge and support guided progression
* Provide downloadable PDF summaries

### 📊 Dashboards & Progress Monitoring

* Monitor assigned training paths
* Track publication consultation
* Monitor training progress
* View quiz results and scores
* Display activity indicators and key statistics
* Provide different monitoring views according to the user's role

### 💬 Comments & Notifications

* Comment on publications
* Notify users about relevant activities and assignments

---

## 🏗️ Architecture

PixiForma follows a **client-server architecture** based on a Next.js frontend communicating with a Laravel REST API.

```text
┌─────────────────────────┐
│       Next.js           │
│        Frontend         │
└────────────┬────────────┘
             │
             │ REST API
             ▼
┌─────────────────────────┐
│        Laravel          │
│         Backend         │
└────────────┬────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
┌───────────┐ ┌────────────────┐
│   MySQL   │ │ AI & Document  │
│ Database  │ │   Processing   │
└───────────┘ └────────────────┘
```

---

## 🛠️ Technologies

### Backend

* **Laravel**
* **PHP**
* **Laravel Passport**
* **MySQL**
* **REST API**
* **Swagger / OpenAPI**

### Frontend

* **Next.js**
* **React**
* **JavaScript / TypeScript**
* **REST API**

### AI & Document Processing

* **PyMuPDF4LLM** for PDF content extraction and conversion
* **OpenRouter** for AI-powered content generation
* AI-generated summaries and quizzes
* **Laravel DomPDF** for downloadable PDF summaries

### Development

* Git
* GitHub
* Postman
* phpMyAdmin

---

## 👥 User Roles

### Administrator

The administrator is responsible for platform-level management, including:

* Managing user accounts
* Managing roles and access
* Managing groups
* Monitoring platform activity

### Trainer

The trainer can:

* Manage assigned groups and collaborators
* Create publications
* Create training paths
* Assign training paths to groups
* Generate AI-powered summaries and quizzes
* Monitor collaborator progress and results

### Collaborator

The collaborator can:

* Access assigned groups
* Consult assigned publications
* Follow assigned training paths
* Complete quizzes
* Track personal progress

---

## 🔄 Main Workflow

A typical PixiForma workflow is:

```text
Trainer
   │
   ▼
Create Publication
   │
   ├──► Upload PDF
   │
   └──► Generate AI Summary / Quiz
   │
   ▼
Create Training Path
   │
   ▼
Select Publications & Order
   │
   ▼
Assign Training to Group
   │
   ▼
Collaborators Access Assigned Content
   │
   ├──► Consult Publications
   │
   ├──► Complete Quizzes
   │
   └──► Track Progress
   │
   ▼
Progress & Activity Monitoring
```

---

## 📚 Core Concepts

### Publication

A **Publication** is an independent knowledge resource that can be consulted by collaborators belonging to a specific group.

A publication can contain a document such as a PDF and can be processed to generate an AI-powered summary or quiz.

### Formation

A **Formation** is a structured path composed of one or more publications.

A trainer can define the order of publications and assign the formation to a specific group.

Two progression approaches are supported:

* **Free mode:** collaborators can consult the publications without quiz-based validation.
* **Guided progression:** collaborators follow the defined progression and can use quizzes for validation.

---

## 📂 Project Structure

The project is organized into two main applications:

```text
PixiForma/
│
├── pixiforma-backend/
│   └── Laravel REST API
│
└── pixiforma-frontend/
    └── Next.js application
```

---

## 🚀 Installation

### Prerequisites

Make sure the following tools are installed:

* PHP
* Composer
* Node.js
* npm
* MySQL
* Git

### Backend

Clone the backend repository:

```bash
git clone <backend-repository-url>
cd pixiforma-backend
```

Install dependencies:

```bash
composer install
```

Create the environment file:

```bash
cp .env.example .env
```

Generate the Laravel application key:

```bash
php artisan key:generate
```

Configure the database and required environment variables in `.env`.

Run the database migrations:

```bash
php artisan migrate
```

Start the Laravel development server:

```bash
php artisan serve
```

### Frontend

Clone the frontend repository:

```bash
git clone <frontend-repository-url>
cd pixiforma-frontend
```

Install dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

---

## 🔐 Environment Variables

Sensitive information such as API keys, database credentials, and application secrets should be stored in environment variables and **must not be committed to the repository**.

Example:

```env
APP_NAME=PixiForma
APP_URL=http://localhost

DB_DATABASE=pixiforma
DB_USERNAME=root
DB_PASSWORD=

OPENROUTER_API_KEY=
```

Adapt the configuration according to your local environment.

---

## 📖 API Documentation

The PixiForma backend exposes a REST API documented using **Swagger / OpenAPI**.

The API documentation can be accessed through the Swagger interface when the backend is running.

---

## 🎯 Project Objectives

PixiForma aims to provide organizations with a centralized solution to:

* Organize and distribute internal knowledge
* Structure training paths
* Assign knowledge resources to specific groups
* Facilitate collaborator training
* Automate document summarization and quiz generation using AI
* Monitor training progress and activity
* Provide useful indicators through role-based dashboards

---

## 👨‍💻 Project Context

PixiForma was developed as part of an **end-of-year internship project at PixiMind**, with a focus on web development, REST API architecture, knowledge management, document processing, and AI-assisted content generation.

---

**PixiForma — Collaborative Knowledge & Training Management Platform**
