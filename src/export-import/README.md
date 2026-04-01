# Export/Import Module

## Overview
The Export/Import module provides functionality for course backup, migration, and sharing. It allows instructors to export their courses to structured formats (JSON/ZIP) and import courses from exported files.

## Features

### Export (Task 23.1 - ✅ Implemented)
- Export courses to JSON format
- Include complete course structure (modules, content items, quizzes, videos, tabs)
- Include course metadata (title, description, dates, settings)
- Exclude learner data (enrollments, progress, grades, certificates)
- Authorization: Instructors can export their own courses, admins can export any course
- Export versioning for future compatibility

### Import (Task 23.2 - ✅ Implemented)
- Import courses from JSON files
- Validate file structure before processing
- Create new course with unique identifier to avoid conflicts
- Report detailed errors and warnings during import
- Always import as DRAFT status for review
- Generate new UUIDs for all entities

## API Endpoints

### Export Course
```
GET /cms/courses/:id/export
```

**Authentication:** Required (JWT)

**Authorization:** INSTRUCTOR (own courses only), ADMIN (any course)

**Query Parameters:**
- `format` (optional): Export format - `json` or `zip` (default: `json`)

**Response:**
- File download with appropriate Content-Type and Content-Disposition headers
- JSON: `application/json`
- ZIP: `application/zip` (not yet implemented)

**Example:**
```bash
curl -X GET \
  'http://localhost:3000/cms/courses/course-123/export?format=json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --output course-export.json
```

### Import Course
```
POST /cms/courses/import
```

**Authentication:** Required (JWT)

**Authorization:** INSTRUCTOR, ADMIN

**Request Body:**
```json
{
  "data": "base64_encoded_json_data"
}
```

**Response:**
```json
{
  "success": true,
  "courseId": "new-course-uuid",
  "errors": [],
  "warnings": [
    {
      "field": "tabs",
      "message": "Missing tabs array, will use defaults",
      "code": "MISSING_TABS"
    }
  ]
}
```

**Example:**
```bash
# Export a course
curl -X GET \
  'http://localhost:3000/cms/courses/course-123/export' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -o course-export.json

# Encode to base64
BASE64_DATA=$(base64 -w 0 course-export.json)

# Import the course
curl -X POST \
  'http://localhost:3000/cms/courses/import' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d "{\"data\": \"$BASE64_DATA\"}"
```

## Export Format

### JSON Structure
```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "course": {
    "title": "Course Title",
    "description": "Course Description",
    "language": "EN",
    "status": "PUBLISHED",
    "enrollmentStart": "2024-01-01T00:00:00.000Z",
    "enrollmentEnd": "2024-12-31T23:59:59.000Z",
    "courseStart": "2024-01-15T00:00:00.000Z",
    "courseEnd": "2024-12-15T23:59:59.000Z"
  },
  "modules": [
    {
      "title": "Module 1",
      "description": "Module Description",
      "order": 1,
      "prerequisiteOrder": null,
      "contentItems": [
        {
          "title": "Content Item 1",
          "type": "TEXT",
          "order": 1,
          "mandatory": true,
          "textContent": "Markdown content here",
          "videoUrl": null,
          "videoEmbedCode": null,
          "documentUrl": null,
          "quiz": null,
          "video": null
        }
      ]
    }
  ],
  "tabs": [
    {
      "title": "Course Info",
      "type": "COURSE_INFO",
      "order": 1,
      "visible": true,
      "content": null,
      "externalUrl": null
    }
  ]
}
```

### Quiz Structure
```json
{
  "quiz": {
    "passingScore": 70.0,
    "maxAttempts": 3,
    "questions": [
      {
        "questionText": "What is 2+2?",
        "order": 1,
        "options": [
          {
            "optionText": "3",
            "isCorrect": false,
            "order": 1
          },
          {
            "optionText": "4",
            "isCorrect": true,
            "order": 2
          }
        ]
      }
    ]
  }
}
```

### Video Structure
```json
{
  "video": {
    "title": "Video Title",
    "description": "Video Description",
    "duration": 300,
    "format": "mp4",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "youtubeUrl": null
  }
}
```

## Import Validation

### Validation Rules

The import service validates the following:

**Version Compatibility:**
- Supported versions: 1.0.0
- Rejects unsupported versions

**Course Metadata:**
- Title: Required, non-empty string
- Language: Must be FR or EN
- Status: Must be DRAFT, PUBLISHED, or ARCHIVED

**Modules:**
- Title: Required, non-empty string
- Order: Required, must be a number
- Content items: Required array

**Content Items:**
- Title: Required, non-empty string
- Type: Must be TEXT, VIDEO, DOCUMENT, or QUIZ
- Order: Required, must be a number

**Quizzes:**
- Passing score: Must be between 0 and 100
- Max attempts: Must be at least 1
- Questions: Must have at least one question
- Each question must have 2-6 options
- Each question must have exactly one correct answer

**Tabs:**
- Title: Required, non-empty string
- Type: Must be valid TabType
- Order: Required, must be a number

### Error Codes

- `INVALID_JSON`: JSON parsing failed
- `INVALID_BASE64`: Base64 decoding failed
- `MISSING_VERSION`: Version field missing
- `UNSUPPORTED_VERSION`: Version not supported
- `MISSING_COURSE`: Course metadata missing
- `INVALID_COURSE_TITLE`: Title missing or invalid
- `INVALID_LANGUAGE`: Language not FR or EN
- `INVALID_STATUS`: Status not valid
- `INVALID_MODULES`: Modules array invalid
- `INVALID_MODULE_TITLE`: Module title missing
- `INVALID_MODULE_ORDER`: Module order invalid
- `INVALID_CONTENT_ITEMS`: Content items array invalid
- `INVALID_ITEM_TITLE`: Content item title missing
- `INVALID_CONTENT_TYPE`: Content type not valid
- `INVALID_PASSING_SCORE`: Quiz passing score out of range
- `INVALID_MAX_ATTEMPTS`: Quiz max attempts invalid
- `MISSING_QUESTIONS`: Quiz has no questions
- `INVALID_QUESTION_TEXT`: Question text missing
- `INVALID_OPTIONS_COUNT`: Question must have 2-6 options
- `INVALID_CORRECT_COUNT`: Question must have exactly one correct answer
- `INVALID_TAB_TITLE`: Tab title missing
- `INVALID_TAB_TYPE`: Tab type not valid

### Warning Codes

- `MISSING_EXPORTED_AT`: exportedAt field missing (non-critical)
- `MISSING_TABS`: Tabs array missing (will use defaults)

## Data Exclusions

The following data is **NOT** included in exports to protect learner privacy:
- Enrollments
- Progress tracking
- Quiz attempts and scores
- Grades and grade history
- Certificates
- User information
- Announcement read status
- Video view tracking

## Import Behavior

### Unique Identifiers
- All entities (course, modules, content items, quizzes, questions, options, videos, tabs) receive new UUIDs
- This prevents conflicts when importing into the same database
- Module prerequisites are resolved using order numbers

### Course Status
- Imported courses are always created with DRAFT status
- This allows instructors to review before publishing
- Original status is preserved in export but not applied on import

### Course Title
- Imported courses have " (Imported)" appended to the title
- This helps distinguish imported courses from originals

### Ownership
- Imported courses are owned by the user performing the import
- Original owner information is not preserved

## Usage Examples

### TypeScript/JavaScript

**Export:**
```typescript
import { ExportService } from './export-import/services/export.service';
import { ExportFormat } from './export-import/dtos/export-course.dto';

const result = await exportService.exportCourse(
  'course-id',
  'user-id',
  UserRole.INSTRUCTOR,
  ExportFormat.JSON
);

fs.writeFileSync('course-export.json', result.data);
```

**Import:**
```typescript
import { ImportService } from './export-import/services/import.service';

const jsonData = fs.readFileSync('course-export.json', 'utf-8');
const result = await importService.importCourse(jsonData, 'user-id');

if (result.success) {
  console.log(`Course imported: ${result.courseId}`);
  if (result.warnings.length > 0) {
    console.log('Warnings:', result.warnings);
  }
} else {
  console.error('Import failed:', result.errors);
}
```

### cURL

**Export:**
```bash
curl -X GET \
  'http://localhost:3000/cms/courses/abc123/export?format=json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -o course-export.json
```

**Import:**
```bash
# Encode to base64
BASE64_DATA=$(base64 -w 0 course-export.json)

# Import
curl -X POST \
  'http://localhost:3000/cms/courses/import' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d "{\"data\": \"$BASE64_DATA\"}"
```

## Error Handling

### Export Errors

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Course with ID abc123 not found"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "You do not have permission to export this course"
}
```

**400 Bad Request** (ZIP format)
```json
{
  "statusCode": 400,
  "message": "ZIP export format is not yet implemented. Please use JSON format."
}
```

### Import Errors

**Validation Failure**
```json
{
  "success": false,
  "errors": [
    {
      "field": "course.title",
      "message": "Missing or invalid course title",
      "code": "INVALID_COURSE_TITLE"
    },
    {
      "field": "modules[0].contentItems[0].quiz.questions[0].options",
      "message": "Question must have exactly one correct answer",
      "code": "INVALID_CORRECT_COUNT"
    }
  ],
  "warnings": []
}
```

**Invalid JSON**
```json
{
  "success": false,
  "errors": [
    {
      "field": "data",
      "message": "Invalid JSON format",
      "code": "INVALID_JSON"
    }
  ],
  "warnings": []
}
```

## Development

### Running Tests
```bash
# Run all export-import tests
npm test -- export-import

# Run service tests
npm test -- export.service.spec
npm test -- import.service.spec

# Run controller tests
npm test -- export.controller.spec
```

### Adding New Export Fields
1. Update the export types in `types/export.types.ts`
2. Update the corresponding export method in `services/export.service.ts`
3. Update the import validation in `services/import.service.ts`
4. Update the import creation logic
5. Add tests for the new field
6. Update this README

## Best Practices

### Exporting
1. Always export courses before major changes
2. Store exports in a secure location
3. Include version information in export filenames
4. Test exports by importing to a test environment

### Importing
1. Review import warnings before publishing
2. Always import as draft and review before publishing
3. Verify all content after import
4. Test quizzes to ensure correct answers are preserved
5. Check module prerequisites are correctly resolved

## Future Enhancements

### ZIP Export (Planned)
- Install archiver package: `npm install archiver @types/archiver`
- Include referenced files (documents, images, videos)
- Add README.txt with export information
- Compress for efficient storage and transfer

### Additional Features
- Batch export/import of multiple courses
- Scheduled automatic backups
- Export to other formats (CSV, XML, SCORM)
- Import from other LMS platforms
- Incremental updates (import changes only)
- Media file migration support
- Import preview before committing

## Requirements Mapping

- **Requirement 16.1**: Export endpoint for instructors ✅
- **Requirement 16.2**: Include all modules, content items, and quiz data ✅
- **Requirement 16.3**: Include course metadata ✅
- **Requirement 16.4**: Exclude learner data ✅
- **Requirement 16.5**: Import functionality ✅
- **Requirement 16.6**: Validate import file structure ✅
- **Requirement 16.7**: Create new course on import ✅
- **Requirement 16.8**: Report import errors ✅

## License
MIT
