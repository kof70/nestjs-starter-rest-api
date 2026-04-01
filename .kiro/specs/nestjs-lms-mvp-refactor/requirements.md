m# Requirements Document - MVP E-Learning NestJS

## Introduction

Ce document définit les exigences pour un MVP de plateforme e-learning moderne, inspiré des concepts Open edX (CMS/LMS) mais refactorisé avec une stack technique légère et maintenable basée sur NestJS, Prisma et PostgreSQL. L'objectif est de livrer rapidement une plateforme testable, sécurisée et adaptée aux contraintes mobile-first avec support multilingue (FR/EN).

## Glossaire

- **LMS** (Learning Management System): Système de gestion de l'apprentissage pour les apprenants
- **CMS** (Content Management System): Système de gestion de contenu pour les créateurs de cours
- **Course**: Cours complet composé de modules et de contenus
- **Module**: Unité d'apprentissage au sein d'un cours
- **Content_Item**: Élément de contenu (vidéo, texte, quiz, etc.)
- **Learner**: Apprenant utilisant la plateforme
- **Instructor**: Instructeur créant et gérant des cours
- **Admin**: Administrateur de la plateforme
- **Progress_Tracker**: Système de suivi de progression
- **Certificate_Generator**: Générateur de certificats
- **Auth_Service**: Service d'authentification et autorisation
- **API**: Interface REST de la plateforme
- **Enrollment_Service**: Service de gestion des inscriptions aux cours
- **Grading_System**: Système de calcul et gestion des notes
- **Instructor_Dashboard**: Tableau de bord pour les instructeurs
- **Notification_Service**: Service de notifications et communications
- **Export_Service**: Service d'export de cours
- **Import_Service**: Service d'import de cours
- **Asset_Manager**: Gestionnaire de fichiers et médias statiques
- **Video_Manager**: Gestionnaire de vidéos et métadonnées associées
- **Tab_Manager**: Gestionnaire d'onglets de cours personnalisables
- **Announcement_Service**: Service de gestion des annonces de cours
- **Course_Team**: Équipe de gestion collaborative d'un cours
- **Cohort**: Groupe d'apprenants regroupés par critères (pays, session, atelier)
- **Cohort_Manager**: Gestionnaire de cohortes et d'accès par groupe
- **Assignment**: Devoir à rendre avec consignes et soumission de fichiers/textes
- **Assignment_Service**: Service de gestion des devoirs et corrections
- **Survey**: Sondage de collecte de feedback sans notion de bonne réponse
- **Survey_Service**: Service de création et gestion de sondages
- **Observer**: Rôle avec accès lecture seule aux dashboards et rapports
- **Search_Engine**: Moteur de recherche interne de contenus
- **Template_Library**: Bibliothèque de templates et checklists téléchargeables
- **Country_Pack**: Pack de contenus adaptés par pays avec variantes contextuelles
- **Content_Variant**: Variante de contenu adaptée à un contexte spécifique (pays, région)

## Requirements

### Requirement 1: Authentification et Gestion des Utilisateurs

**User Story:** En tant qu'utilisateur, je veux pouvoir m'authentifier de manière sécurisée, afin d'accéder aux fonctionnalités selon mon rôle.

#### Acceptance Criteria

1. THE Auth_Service SHALL hash passwords using bcrypt with minimum 10 rounds
2. WHEN a user attempts login with valid credentials, THE Auth_Service SHALL issue a JWT token valid for 24 hours
3. WHEN a user attempts login with invalid credentials, THE Auth_Service SHALL return an error after maximum 3 seconds to prevent timing attacks
4. THE API SHALL validate JWT tokens on all protected endpoints
5. THE Auth_Service SHALL support three roles: Admin, Instructor, and Learner
6. WHEN a user registers, THE Auth_Service SHALL require email verification within 24 hours
7. THE Auth_Service SHALL support password reset via email with tokens valid for 1 hour

### Requirement 2: Gestion des Cours (CMS)

**User Story:** En tant qu'instructeur, je veux créer et gérer des cours structurés, afin de proposer du contenu pédagogique organisé.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE CMS SHALL allow creation of new courses
2. WHEN creating a course, THE CMS SHALL require a title, description, and language (FR or EN)
3. THE CMS SHALL allow instructors to add modules to their courses
4. THE CMS SHALL allow instructors to reorder modules within a course
5. WHEN an instructor publishes a course, THE CMS SHALL validate that at least one module exists
6. THE CMS SHALL allow instructors to set course visibility (draft, published, archived)
7. WHERE a course is in draft status, THE LMS SHALL not display it to learners
8. THE CMS SHALL track course modification timestamps and author information
9. THE CMS SHALL allow instructors to set enrollment start and end dates for courses
10. THE CMS SHALL allow instructors to set course start and end dates
11. THE CMS SHALL support course versioning to track content changes

### Requirement 3: Gestion du Contenu Pédagogique

**User Story:** En tant qu'instructeur, je veux ajouter différents types de contenu à mes modules, afin de créer des expériences d'apprentissage variées.

#### Acceptance Criteria

1. THE CMS SHALL support four content types: text, video, document, and quiz
2. WHEN adding a text content, THE CMS SHALL support markdown formatting
3. WHEN adding a video content, THE CMS SHALL accept video URLs and embed codes
4. WHEN adding a document content, THE CMS SHALL accept PDF files up to 10MB
5. THE CMS SHALL allow instructors to set content order within modules
6. THE CMS SHALL require a title for each Content_Item
7. WHERE a Content_Item is marked as mandatory, THE Progress_Tracker SHALL require completion before course completion

### Requirement 4: Système de Quiz et Évaluations

**User Story:** En tant qu'instructeur, je veux créer des quiz pour évaluer les apprenants, afin de valider leur compréhension.

#### Acceptance Criteria

1. THE CMS SHALL allow creation of multiple-choice questions with 2 to 6 options
2. WHEN creating a quiz question, THE CMS SHALL require exactly one correct answer
3. THE CMS SHALL allow instructors to set a passing score percentage for quizzes
4. WHEN a learner submits a quiz, THE LMS SHALL calculate the score immediately
5. THE LMS SHALL allow learners to retry failed quizzes up to 3 times
6. THE LMS SHALL display correct answers only after quiz completion
7. THE Progress_Tracker SHALL record all quiz attempts with timestamps and scores

### Requirement 5: Interface d'Apprentissage (LMS)

**User Story:** En tant qu'apprenant, je veux accéder aux cours et suivre ma progression, afin d'apprendre à mon rythme.

#### Acceptance Criteria

1. THE LMS SHALL display all published courses to authenticated learners
2. WHEN a learner enrolls in a course, THE LMS SHALL create a progress record
3. THE LMS SHALL display course modules in the defined order
4. WHEN a learner completes a Content_Item, THE Progress_Tracker SHALL mark it as completed
5. THE LMS SHALL display overall course progress as a percentage
6. THE LMS SHALL allow learners to navigate freely between unlocked modules
7. WHERE a module has prerequisites, THE LMS SHALL lock it until prerequisites are completed
8. THE LMS SHALL support course search by title and description in the user's language
9. WHEN enrollment dates are set, THE LMS SHALL only allow enrollment within the specified period
10. THE LMS SHALL display course start and end dates to enrolled learners
11. THE LMS SHALL allow learners to unenroll from courses before completion

### Requirement 6: Suivi de Progression

**User Story:** En tant qu'apprenant, je veux voir ma progression détaillée, afin de suivre mon avancement.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL record completion timestamp for each Content_Item
2. THE Progress_Tracker SHALL calculate module completion based on mandatory Content_Items
3. THE Progress_Tracker SHALL calculate course completion when all modules are completed
4. THE LMS SHALL display a progress dashboard showing enrolled courses and completion percentages
5. THE Progress_Tracker SHALL track time spent on each Content_Item
6. THE LMS SHALL display estimated time remaining for course completion
7. THE Progress_Tracker SHALL persist progress data even during connectivity loss and sync when connection is restored

### Requirement 7: Génération de Certificats

**User Story:** En tant qu'apprenant, je veux obtenir un certificat à la fin d'un cours, afin de valoriser mon apprentissage.

#### Acceptance Criteria

1. WHEN a learner completes a course with 100% progress, THE Certificate_Generator SHALL create a certificate
2. THE Certificate_Generator SHALL include learner name, course title, completion date, and unique certificate ID
3. THE Certificate_Generator SHALL generate certificates in PDF format
4. THE LMS SHALL allow learners to download their certificates
5. THE API SHALL provide a public endpoint to verify certificate authenticity using certificate ID
6. WHERE a course has a minimum passing score, THE Certificate_Generator SHALL only issue certificates when the score is met
7. THE Certificate_Generator SHALL support certificate templates in FR and EN

### Requirement 8: Gestion des Rôles et Permissions

**User Story:** En tant qu'administrateur, je veux gérer les rôles et permissions, afin de contrôler l'accès aux fonctionnalités.

#### Acceptance Criteria

1. THE Auth_Service SHALL enforce role-based access control on all endpoints
2. WHERE the user has Admin role, THE API SHALL allow user role assignment
3. WHERE the user has Instructor role, THE API SHALL restrict course management to their own courses
4. WHERE the user has Learner role, THE API SHALL restrict access to enrolled courses only
5. THE API SHALL return HTTP 403 when a user attempts unauthorized actions
6. THE Auth_Service SHALL log all permission violations with user ID and attempted action
7. WHERE the user has Admin role, THE API SHALL allow viewing all courses and user activities

### Requirement 9: Support Multilingue

**User Story:** En tant qu'utilisateur, je veux utiliser la plateforme dans ma langue, afin d'améliorer mon expérience.

#### Acceptance Criteria

1. THE API SHALL support French and English languages
2. WHEN a user sets their language preference, THE API SHALL persist it in their profile
3. THE LMS SHALL display interface elements in the user's preferred language
4. THE CMS SHALL allow instructors to create courses in FR or EN
5. THE LMS SHALL filter course search results based on user's language preference
6. THE API SHALL return error messages in the user's preferred language
7. WHERE a translation is missing, THE API SHALL fallback to English

### Requirement 10: Optimisation Mobile et Connectivité Variable

**User Story:** En tant qu'apprenant mobile, je veux utiliser la plateforme avec une connexion instable, afin d'apprendre en mobilité.

#### Acceptance Criteria

1. THE API SHALL implement response compression for all endpoints
2. THE API SHALL return paginated results with maximum 20 items per page
3. THE API SHALL implement HTTP caching headers for static content
4. WHEN network connectivity is lost, THE LMS SHALL display cached course content
5. WHEN network connectivity is restored, THE Progress_Tracker SHALL sync pending progress updates
6. THE API SHALL respond to health check requests within 100ms
7. THE API SHALL implement request timeout of 30 seconds for all operations
8. THE API SHALL optimize database queries to prevent N+1 problems using Prisma's include and select

### Requirement 11: Sécurité et Traçabilité

**User Story:** En tant qu'administrateur, je veux garantir la sécurité et tracer les actions, afin de protéger les données et auditer l'activité.

#### Acceptance Criteria

1. THE API SHALL implement rate limiting of 100 requests per minute per user
2. THE API SHALL sanitize all user inputs to prevent SQL injection and XSS attacks
3. THE API SHALL log all authentication attempts with IP address and timestamp
4. THE API SHALL log all course modifications with user ID, action type, and timestamp
5. THE API SHALL encrypt sensitive data at rest in PostgreSQL
6. THE API SHALL implement CORS restrictions to allowed origins only
7. THE API SHALL validate all file uploads for type and size before processing
8. WHERE suspicious activity is detected, THE API SHALL temporarily lock the user account and notify administrators

### Requirement 12: Parsing et Sérialisation des Données

**User Story:** En tant que développeur, je veux parser et sérialiser les données de manière fiable, afin de garantir l'intégrité des échanges.

#### Acceptance Criteria

1. WHEN the API receives course data, THE Parser SHALL validate it against the defined schema
2. WHEN the API returns course data, THE Serializer SHALL format it according to the API specification
3. THE Parser SHALL reject invalid JSON payloads with descriptive error messages
4. THE Serializer SHALL exclude sensitive fields (passwords, tokens) from API responses
5. THE Pretty_Printer SHALL format course export data in valid JSON format
6. FOR ALL valid course objects, parsing then serializing then parsing SHALL produce an equivalent object (round-trip property)
7. WHEN parsing quiz data, THE Parser SHALL validate that exactly one answer is marked as correct

### Requirement 13: Gestion des Inscriptions (Enrollment)

**User Story:** En tant qu'apprenant, je veux m'inscrire aux cours disponibles, afin de commencer mon apprentissage.

#### Acceptance Criteria

1. WHEN a learner requests enrollment in a published course, THE Enrollment_Service SHALL create an enrollment record
2. THE Enrollment_Service SHALL validate that enrollment is within allowed dates before creating enrollment
3. WHEN a learner is enrolled, THE LMS SHALL grant access to course content
4. THE Enrollment_Service SHALL track enrollment date and status (active, inactive, completed)
5. WHEN a learner unenrolls, THE Enrollment_Service SHALL mark enrollment as inactive without deleting progress data
6. WHERE the user has Instructor role, THE API SHALL allow viewing all enrollments for their courses
7. WHERE the user has Admin role, THE API SHALL allow bulk enrollment operations via CSV upload
8. THE Enrollment_Service SHALL prevent duplicate active enrollments for the same user and course

### Requirement 14: Tableau de Bord Instructeur

**User Story:** En tant qu'instructeur, je veux suivre l'activité de mes apprenants, afin d'identifier ceux qui ont besoin d'aide.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Instructor_Dashboard SHALL display enrollment statistics for their courses
2. THE Instructor_Dashboard SHALL display learner progress summary with completion percentages
3. THE Instructor_Dashboard SHALL display quiz scores and attempts for all learners
4. THE Instructor_Dashboard SHALL allow filtering learners by progress status (not started, in progress, completed)
5. THE Instructor_Dashboard SHALL allow exporting learner data to CSV format
6. THE Instructor_Dashboard SHALL display average time spent per module
7. WHERE a learner is struggling, THE Instructor_Dashboard SHALL highlight learners with low quiz scores or no recent activity
8. THE Instructor_Dashboard SHALL allow instructors to send bulk emails to enrolled learners

### Requirement 15: Système de Notes Détaillé

**User Story:** En tant qu'apprenant, je veux voir mes notes détaillées, afin de comprendre mes points forts et faibles.

#### Acceptance Criteria

1. THE Grading_System SHALL calculate grades at three levels: item, module, and course
2. WHEN a quiz is completed, THE Grading_System SHALL immediately update item-level grade
3. THE Grading_System SHALL aggregate item grades to calculate module grade based on weights
4. THE Grading_System SHALL aggregate module grades to calculate overall course grade
5. THE LMS SHALL display grade breakdown showing scores for each graded item
6. THE Grading_System SHALL support weighted grading where different modules have different weights
7. THE Grading_System SHALL track grade history with timestamps for all changes
8. WHERE an instructor overrides a grade, THE Grading_System SHALL record the override reason and timestamp
9. THE LMS SHALL display letter grades (A, B, C, D, F) based on configurable percentage thresholds

### Requirement 16: Export et Import de Cours

**User Story:** En tant qu'instructeur, je veux exporter et importer des cours, afin de réutiliser du contenu ou faire des sauvegardes.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE CMS SHALL allow exporting courses to a structured format (JSON or ZIP)
2. WHEN exporting a course, THE Export_Service SHALL include all modules, content items, and quiz data
3. THE Export_Service SHALL include course metadata (title, description, dates, settings)
4. THE Export_Service SHALL exclude learner data (progress, grades, enrollments) from course exports
5. WHERE the user has Instructor role, THE CMS SHALL allow importing courses from exported files
6. WHEN importing a course, THE Import_Service SHALL validate the file structure before processing
7. THE Import_Service SHALL create a new course with a unique identifier to avoid conflicts
8. THE Import_Service SHALL report any errors or warnings encountered during import

### Requirement 17: Notifications et Communications

**User Story:** En tant qu'utilisateur, je veux recevoir des notifications importantes, afin de rester informé des événements clés.

#### Acceptance Criteria

1. WHEN a learner enrolls in a course, THE Notification_Service SHALL send a welcome email
2. WHEN a course is published, THE Notification_Service SHALL notify enrolled learners
3. WHEN a certificate is generated, THE Notification_Service SHALL notify the learner via email
4. WHEN a quiz deadline approaches, THE Notification_Service SHALL send reminder notifications 24 hours before
5. THE Notification_Service SHALL support email notifications with configurable templates
6. THE API SHALL allow users to configure notification preferences (email on/off for each type)
7. THE Notification_Service SHALL log all sent notifications with timestamps and delivery status
8. WHERE an instructor sends a bulk message, THE Notification_Service SHALL queue messages and send asynchronously

### Requirement 18: Gestion des Assets et Médias

**User Story:** En tant qu'instructeur, je veux uploader et gérer des fichiers médias pour mes cours, afin d'enrichir le contenu pédagogique avec des images et documents.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Asset_Manager SHALL allow uploading image files (JPEG, PNG, GIF, WebP) up to 5MB
2. WHERE the user has Instructor role, THE Asset_Manager SHALL allow uploading document files (PDF, DOCX, PPTX) up to 20MB
3. WHEN an asset is uploaded, THE Asset_Manager SHALL validate file type and size before storage
4. THE Asset_Manager SHALL generate unique identifiers for each uploaded asset
5. THE Asset_Manager SHALL store asset metadata (filename, size, type, upload date, uploader ID)
6. THE CMS SHALL allow instructors to browse and search their uploaded assets
7. THE CMS SHALL allow instructors to delete assets that are not referenced in any course content
8. WHEN an asset is referenced in course content, THE Asset_Manager SHALL prevent deletion and return an error
9. THE API SHALL serve assets with appropriate caching headers (max-age 86400 seconds)
10. THE Asset_Manager SHALL organize assets by course to facilitate management
11. THE Asset_Manager SHALL track asset usage count across course content items

### Requirement 19: Gestion Avancée des Vidéos

**User Story:** En tant qu'instructeur, je veux gérer des vidéos avec métadonnées enrichies, afin d'offrir une expérience vidéo optimale aux apprenants.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Video_Manager SHALL allow uploading video files (MP4, WebM) up to 500MB
2. WHEN a video is uploaded, THE Video_Manager SHALL generate a presigned URL valid for 7 days for storage
3. THE Video_Manager SHALL allow instructors to add video thumbnails (image files up to 2MB)
4. WHEN no thumbnail is provided, THE Video_Manager SHALL use a default placeholder image
5. THE Video_Manager SHALL store video metadata (title, description, duration, format, upload date)
6. THE CMS SHALL allow instructors to add YouTube video URLs as an alternative to uploads
7. WHEN a YouTube URL is provided, THE Video_Manager SHALL validate the URL format
8. THE Video_Manager SHALL track video view count per learner for analytics
9. THE LMS SHALL display video duration and format information to learners
10. THE Video_Manager SHALL support multiple video qualities (SD, HD) where available
11. WHERE a video has multiple qualities, THE LMS SHALL allow learners to select their preferred quality

### Requirement 20: Onglets de Cours Personnalisables

**User Story:** En tant qu'instructeur, je veux personnaliser les onglets de navigation de mes cours, afin d'organiser le contenu selon mes besoins pédagogiques.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Tab_Manager SHALL allow adding custom tabs to courses
2. THE Tab_Manager SHALL support five default tab types: Course Info, Syllabus, Content, Progress, Discussion
3. WHEN creating a custom tab, THE CMS SHALL require a tab title and content type (static page or external link)
4. THE Tab_Manager SHALL allow instructors to reorder tabs via drag-and-drop or position index
5. THE Tab_Manager SHALL allow instructors to hide or show tabs for learners
6. WHERE a tab is hidden, THE LMS SHALL not display it to learners but keep it visible to instructors
7. THE Tab_Manager SHALL validate that at least one tab (Content) remains visible to learners
8. WHEN a custom static tab is created, THE CMS SHALL provide a rich text editor for content
9. WHEN an external link tab is created, THE Tab_Manager SHALL validate the URL format
10. THE LMS SHALL display tabs in the order defined by the instructor
11. THE Tab_Manager SHALL persist tab configuration as part of course data

### Requirement 21: Annonces et Mises à Jour de Cours

**User Story:** En tant qu'instructeur, je veux publier des annonces pour mes cours, afin de communiquer des informations importantes aux apprenants inscrits.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Announcement_Service SHALL allow creating course announcements
2. WHEN creating an announcement, THE CMS SHALL require a title and content (rich text format)
3. THE Announcement_Service SHALL timestamp each announcement with creation date
4. THE LMS SHALL display announcements in reverse chronological order (newest first)
5. THE LMS SHALL display announcements only to enrolled learners
6. WHERE the user has Instructor role, THE CMS SHALL allow editing existing announcements
7. WHERE the user has Instructor role, THE CMS SHALL allow soft-deleting announcements (mark as deleted without removing data)
8. WHEN an announcement is soft-deleted, THE LMS SHALL hide it from learners but keep it visible to instructors
9. THE Announcement_Service SHALL limit announcement content to 5000 characters
10. WHEN a new announcement is published, THE Notification_Service SHALL send email notifications to enrolled learners with notification preferences enabled
11. THE LMS SHALL display an announcement count badge on the course page when new announcements exist since last learner visit

### Requirement 22: Gestion d'Équipe de Cours Collaborative

**User Story:** En tant qu'instructeur principal, je veux ajouter des co-instructeurs à mon équipe de cours, afin de partager la gestion et la création de contenu.

#### Acceptance Criteria

1. WHERE the user has Instructor role and is course owner, THE CMS SHALL allow adding team members by email
2. THE CMS SHALL support two team roles: Editor (can modify content) and Viewer (read-only access)
3. WHEN adding a team member, THE Course_Team SHALL send an invitation email with acceptance link
4. WHEN a team member accepts invitation, THE Course_Team SHALL grant appropriate permissions
5. WHERE the user has Editor role, THE CMS SHALL allow full course content modification except team management
6. WHERE the user has Viewer role, THE CMS SHALL allow viewing course content and analytics without modification
7. WHERE the user is course owner, THE CMS SHALL allow removing team members at any time
8. THE Course_Team SHALL prevent course owner from removing themselves unless another owner exists
9. THE CMS SHALL display team member list with roles and last activity date
10. THE Course_Team SHALL log all team member actions (content changes, settings updates) with member ID and timestamp
11. WHERE the user has Admin role, THE API SHALL allow viewing and managing teams for all courses

## Notes Techniques

### Architecture Cible
- Backend: NestJS avec TypeScript
- ORM: Prisma pour la gestion de la base de données
- Base de données: PostgreSQL
- Starter: https://github.com/kof70/nestjs-starter-rest-api

### Priorités MVP
- Livraison rapide avec fonctionnalités essentielles
- Tests automatisés pour toute logique métier
- Documentation API (Swagger/OpenAPI)
- Déploiement containerisé (Docker)

### Exclusions MVP (V2)
- Intégration vidéo avancée (streaming adaptatif, transcoding automatique multi-formats)
- Transcriptions vidéo automatiques et sous-titres multi-langues
- Configuration de groupes complexes (A/B testing, expériences personnalisées)
- Examens d'entrée avec milestones
- Export Git et versioning avancé
- Proctoring et surveillance d'examens
- Checklists automatiques de création de cours
- Gamification (badges, points, classements)
- Forum de discussion et équipes collaboratives
- Notifications push mobile
- Intégration avec systèmes externes (LTI, SCORM, xAPI)
- Analytics avancés et rapports personnalisés
- Support de plus de 2 langues
- Système de wiki de cours
- Programmes et parcours d'apprentissage multi-cours
- Marketplace de cours
- Système de paiement et commerce électronique
- Vérification d'identité avancée


### Requirement 23: Gestion des Cohortes

**User Story:** En tant qu'administrateur ou instructeur, je veux grouper des apprenants en cohortes, afin de gérer l'accès aux cours par groupe et générer des rapports ciblés.

#### Acceptance Criteria

1. WHERE the user has Admin or Instructor role, THE Cohort_Manager SHALL allow creating cohorts with name and description
2. THE Cohort_Manager SHALL support grouping criteria: country, session, workshop, or custom tags
3. WHEN creating a cohort, THE Cohort_Manager SHALL require a unique cohort name within the course
4. WHERE the user has Admin or Instructor role, THE Cohort_Manager SHALL allow adding learners to cohorts individually or via bulk CSV upload
5. THE Cohort_Manager SHALL allow assigning course access permissions at cohort level
6. WHEN a learner is added to a cohort, THE LMS SHALL grant access to courses assigned to that cohort
7. WHERE the user has Instructor role, THE Instructor_Dashboard SHALL display progress and grades filtered by cohort
8. THE Cohort_Manager SHALL allow learners to belong to multiple cohorts simultaneously
9. THE Cohort_Manager SHALL track cohort membership with start and end dates
10. WHERE the user has Admin role, THE API SHALL allow viewing and managing all cohorts across all courses
11. THE Cohort_Manager SHALL generate cohort-specific reports including enrollment, completion rates, and average grades

### Requirement 24: Devoirs à Rendre (Assignments)

**User Story:** En tant qu'instructeur, je veux créer des devoirs avec consignes et permettre aux apprenants de soumettre des fichiers ou textes, afin d'évaluer leur travail de manière personnalisée.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Assignment_Service SHALL allow creating assignments with title, instructions, and due date
2. WHEN creating an assignment, THE CMS SHALL allow specifying submission type: file upload, text entry, or both
3. THE Assignment_Service SHALL allow setting maximum file size (up to 50MB) and allowed file types for uploads
4. WHEN a learner submits an assignment, THE Assignment_Service SHALL record submission timestamp and content
5. THE Assignment_Service SHALL allow learners to resubmit assignments before the due date
6. WHEN the due date has passed, THE Assignment_Service SHALL prevent new submissions unless late submissions are enabled
7. WHERE the user has Instructor role, THE Assignment_Service SHALL allow viewing all submissions with learner names and timestamps
8. WHERE the user has Instructor role, THE Assignment_Service SHALL allow grading submissions with numerical score and written feedback
9. WHEN an assignment is graded, THE Notification_Service SHALL notify the learner via email
10. THE LMS SHALL display assignment status to learners: not submitted, submitted, graded
11. THE Grading_System SHALL include assignment grades in overall course grade calculation based on configured weight
12. THE Assignment_Service SHALL support rubric-based grading with multiple criteria and point allocations

### Requirement 25: Sondages (Surveys)

**User Story:** En tant qu'instructeur, je veux créer des sondages pour collecter du feedback et mesurer la satisfaction, afin d'améliorer mes cours sans notion de bonne ou mauvaise réponse.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Survey_Service SHALL allow creating surveys with title and description
2. THE Survey_Service SHALL support four question types: multiple choice, checkboxes, short text, and long text
3. WHEN creating a survey question, THE CMS SHALL allow marking questions as required or optional
4. THE Survey_Service SHALL allow instructors to set survey availability dates (start and end)
5. WHEN a learner accesses a survey, THE LMS SHALL display all questions in the defined order
6. WHEN a learner submits a survey, THE Survey_Service SHALL validate that all required questions are answered
7. THE Survey_Service SHALL allow anonymous responses where configured by instructor
8. WHERE the user has Instructor role, THE Survey_Service SHALL display aggregated results with response counts and percentages
9. THE Survey_Service SHALL allow exporting survey results to CSV format with individual responses
10. THE Survey_Service SHALL prevent learners from submitting the same survey multiple times unless configured otherwise
11. WHERE a survey is anonymous, THE Survey_Service SHALL not store learner identifiers with responses
12. THE LMS SHALL display survey completion status to learners without showing scores (surveys are not graded)

### Requirement 26: Rôle Observateur

**User Story:** En tant que partenaire ou autorité, je veux accéder aux dashboards et rapports en lecture seule, afin de suivre l'activité sans pouvoir modifier le contenu ou les utilisateurs.

#### Acceptance Criteria

1. THE Auth_Service SHALL support a fourth role: Observer with read-only permissions
2. WHERE the user has Observer role, THE API SHALL allow viewing course content without modification capabilities
3. WHERE the user has Observer role, THE Instructor_Dashboard SHALL display analytics and reports in read-only mode
4. THE API SHALL return HTTP 403 when an Observer attempts to create, update, or delete any resource
5. WHERE the user has Admin role, THE API SHALL allow assigning Observer role with scope restrictions (specific courses or cohorts)
6. WHERE an Observer has course-level scope, THE API SHALL restrict dashboard access to assigned courses only
7. WHERE an Observer has cohort-level scope, THE API SHALL restrict reports to assigned cohorts only
8. THE API SHALL log all Observer access attempts with viewed resources and timestamps
9. WHERE the user has Observer role, THE LMS SHALL hide course editing controls and management interfaces
10. THE API SHALL allow Observers to export reports to PDF or CSV format
11. WHERE the user has Admin role, THE API SHALL allow revoking Observer access at any time

### Requirement 27: Recherche Interne de Contenus

**User Story:** En tant qu'apprenant, je veux rechercher des contenus par titre, description ou mots-clés, afin de trouver rapidement les ressources pertinentes.

#### Acceptance Criteria

1. THE Search_Engine SHALL index course titles, descriptions, module names, and content item titles
2. WHEN a learner performs a search, THE Search_Engine SHALL return results matching query terms in indexed fields
3. THE Search_Engine SHALL support partial word matching and case-insensitive search
4. THE LMS SHALL display search results with course title, matching content snippet, and relevance score
5. THE Search_Engine SHALL allow filtering results by content type (video, document, quiz, text)
6. THE Search_Engine SHALL allow filtering results by course enrollment status (enrolled, not enrolled)
7. THE Search_Engine SHALL rank results by relevance with exact matches prioritized over partial matches
8. WHEN no results are found, THE LMS SHALL display suggestions based on similar terms or popular courses
9. THE Search_Engine SHALL return paginated results with maximum 10 items per page
10. THE Search_Engine SHALL respect course visibility and enrollment restrictions in search results
11. THE Search_Engine SHALL track search queries and result clicks for analytics and improvement
12. THE Search_Engine SHALL support search in both FR and EN with language-specific stemming

### Requirement 28: Templates et Checklists Téléchargeables

**User Story:** En tant qu'apprenant, je veux télécharger des templates et checklists fournis dans les cours, afin d'utiliser des ressources pratiques pour mon apprentissage.

#### Acceptance Criteria

1. WHERE the user has Instructor role, THE Template_Library SHALL allow uploading template files (DOCX, XLSX, PDF) up to 20MB
2. WHEN uploading a template, THE CMS SHALL require a title, description, and category (template or checklist)
3. THE Template_Library SHALL allow instructors to associate templates with specific modules or courses
4. THE LMS SHALL display available templates organized by module with title and description
5. WHEN a learner clicks download, THE Template_Library SHALL serve the file with appropriate content-type headers
6. THE Template_Library SHALL track download count per template for analytics
7. WHERE the user has Instructor role, THE CMS SHALL display template usage statistics (downloads per learner)
8. THE Template_Library SHALL allow instructors to update template files while preserving download history
9. THE Template_Library SHALL support versioning with version number and update notes
10. WHEN a template is updated, THE Notification_Service SHALL notify enrolled learners of the new version
11. THE LMS SHALL allow learners to download all templates for a course as a single ZIP archive
12. THE Template_Library SHALL validate file integrity and scan for malware before making templates available

### Requirement 29: Packs Pays (Adaptation Contextuelle)

**User Story:** En tant qu'administrateur, je veux créer des packs de contenus adaptés par pays, afin de proposer des cours avec variantes contextuelles tout en maintenant un contenu cœur commun.

#### Acceptance Criteria

1. WHERE the user has Admin role, THE CMS SHALL allow creating Country_Packs with country identifier and name
2. THE CMS SHALL support defining core content shared across all countries within a course
3. WHERE the user has Instructor role, THE CMS SHALL allow creating Content_Variants associated with specific Country_Packs
4. WHEN creating a Content_Variant, THE CMS SHALL require specifying which core content it replaces or supplements
5. THE Content_Variant SHALL support adaptation types: local actors, case studies, priorities, and terminology
6. WHEN a learner from a specific country accesses a course, THE LMS SHALL display Content_Variants matching their country when available
7. WHERE no Content_Variant exists for a learner's country, THE LMS SHALL display the core content as fallback
8. WHERE the user has Admin role, THE CMS SHALL allow replicating Country_Packs to create new country configurations rapidly
9. THE CMS SHALL track which content items have variants and for which countries
10. WHERE the user has Instructor role, THE CMS SHALL display a variant coverage report showing which countries have complete adaptations
11. THE CMS SHALL allow bulk import of Content_Variants via structured JSON format for efficient country pack creation
12. THE LMS SHALL allow learners to manually select a country context if their profile country differs from their learning needs
