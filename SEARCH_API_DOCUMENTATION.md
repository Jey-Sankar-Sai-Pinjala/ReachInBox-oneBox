# Email Search API Documentation

## Overview
The ReachInbox Onebox provides a powerful email search API with advanced filtering, pagination, and sorting capabilities. The API supports both simple GET requests and advanced POST requests for complex queries.

## Base URL
```
http://localhost:3001/api/emails
```

## Search Endpoints

### 1. Basic Search (GET)
**Endpoint:** `GET /api/emails/search`

**Query Parameters:**
- `q` (string, optional): Search query term
- `account` (string, optional): Filter by account ID
- `folder` (string, optional): Filter by folder name
- `category` (string, optional): Filter by AI category
- `from` (string, optional): Filter by sender email
- `to` (string, optional): Filter by recipient email
- `dateFrom` (string, optional): Filter emails from date (ISO format)
- `dateTo` (string, optional): Filter emails to date (ISO format)
- `hasAttachments` (boolean, optional): Filter by attachment presence
- `page` (number, optional): Page number (default: 1)
- `size` (number, optional): Results per page (default: 20, max: 100)
- `sortBy` (string, optional): Sort field (date, subject, from, indexedAt)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Example Requests:**
```bash
# Simple search
GET /api/emails/search?q=meeting

# Search with filters
GET /api/emails/search?q=project&account=user@example.com&folder=INBOX&category=Interested

# Search with pagination and sorting
GET /api/emails/search?q=urgent&page=2&size=10&sortBy=date&sortOrder=desc

# Advanced query with operators
GET /api/emails/search?q="important meeting" AND project
```

### 2. Advanced Search (POST)
**Endpoint:** `POST /api/emails/search/advanced`

**Request Body:**
```json
{
  "query": "search term",
  "filters": {
    "accountId": "user@example.com",
    "folder": "INBOX",
    "category": "Interested",
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "dateFrom": "2024-01-01T00:00:00Z",
    "dateTo": "2024-12-31T23:59:59Z",
    "hasAttachments": true
  },
  "pagination": {
    "page": 1,
    "size": 20
  },
  "sort": {
    "field": "date",
    "order": "desc"
  }
}
```

## Query Types

### 1. Simple Text Search
Uses `multi_match` query for fuzzy matching across multiple fields:
- Subject (3x weight)
- Subject.raw (2x weight for exact matches)
- Body (1x weight)
- From.text (1.5x weight)
- To.text (1x weight)

### 2. Advanced Query String
Automatically detects and uses `query_string` for queries containing:
- Quotes: `"exact phrase"`
- Operators: `AND`, `OR`, `NOT`
- Wildcards: `*`, `?`
- Special characters: `+`, `-`, `~`

**Examples:**
```bash
# Exact phrase
"project deadline"

# Boolean operators
meeting AND urgent
project OR task
NOT spam

# Wildcards
project*

# Field-specific search
subject:meeting AND body:urgent
```

## Filtering

All filters use the `filter` clause in Elasticsearch bool queries, ensuring:
- Fast exact matches
- No impact on search scores
- Efficient performance

### Supported Filters:
- **accountId**: Exact account match
- **folder**: Exact folder match
- **category**: Exact category match
- **from**: Exact or wildcard sender match
- **to**: Exact or wildcard recipient match
- **hasAttachments**: Boolean filter
- **dateFrom/dateTo**: Date range filter

## Response Format

### Success Response:
```json
{
  "success": true,
  "data": {
    "hits": [
      {
        "id": "email-id",
        "accountId": "user@example.com",
        "folder": "INBOX",
        "subject": "Email Subject",
        "body": "Email body content...",
        "from": "sender@example.com",
        "to": ["recipient@example.com"],
        "date": "2024-01-15T10:30:00Z",
        "aiCategory": "Interested",
        "indexedAt": "2024-01-15T10:35:00Z",
        "messageId": "message-id",
        "threadId": "thread-id",
        "hasAttachments": false,
        "attachmentCount": 0
      }
    ],
    "total": 150,
    "page": 1,
    "size": 20,
    "totalPages": 8
  },
  "meta": {
    "query": {
      "search": "meeting",
      "filters": {
        "account": "user@example.com",
        "folder": "INBOX",
        "category": null,
        "from": null,
        "to": null,
        "dateFrom": null,
        "dateTo": null,
        "hasAttachments": null
      },
      "pagination": {
        "page": 1,
        "size": 20,
        "totalPages": 8,
        "totalResults": 150
      },
      "sort": {
        "field": "date",
        "order": "desc"
      }
    }
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Elasticsearch Query Structure

The API generates Elasticsearch queries following this structure:

```javascript
const esQuery = {
  query: {
    bool: {
      must: [
        // Text search queries (multi_match or query_string)
        { multi_match: { query: 'search term', fields: ['subject^3', 'body^1'] } }
      ],
      filter: [
        // Exact match filters (doesn't affect search score)
        { term: { accountId: 'user@example.com' } },
        { term: { folder: 'INBOX' } },
        { range: { date: { gte: '2024-01-01', lte: '2024-12-31' } } }
      ]
    }
  },
  from: 0,
  size: 20,
  sort: [{ date: { order: 'desc' } }]
};
```

## Performance Features

1. **Custom Analyzer**: Uses `email_analyzer` with lowercase, stop words, snowball stemming, and ASCII folding
2. **Multi-field Mapping**: Supports both analyzed and exact match fields
3. **Filter Optimization**: Uses filter clauses for exact matches (no scoring overhead)
4. **Pagination**: Efficient offset-based pagination with configurable page sizes
5. **Sorting**: Multiple sort fields with configurable order

## Usage Examples

### Frontend Integration:
```javascript
// Simple search
const response = await fetch('/api/emails/search?q=meeting&page=1&size=10');
const data = await response.json();

// Advanced search
const response = await fetch('/api/emails/search/advanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'project deadline',
    filters: {
      accountId: 'user@example.com',
      category: 'Interested',
      hasAttachments: true
    },
    pagination: { page: 1, size: 20 },
    sort: { field: 'date', order: 'desc' }
  })
});
```

### cURL Examples:
```bash
# Basic search
curl "http://localhost:3001/api/emails/search?q=meeting&page=1&size=10"

# Advanced search
curl -X POST "http://localhost:3001/api/emails/search/advanced" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "urgent project",
    "filters": {
      "accountId": "user@example.com",
      "category": "Interested"
    },
    "pagination": { "page": 1, "size": 20 }
  }'
```

## Error Handling

The API includes comprehensive error handling:
- Input validation for pagination and sort parameters
- Elasticsearch error handling
- Proper HTTP status codes
- Detailed error messages

## Rate Limiting

- Maximum page size: 100 results
- Default page size: 20 results
- No rate limiting currently implemented (can be added as needed)
