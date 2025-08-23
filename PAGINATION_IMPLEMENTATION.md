# Pagination Implementation for Hospital Billing System

## Overview

This document describes the comprehensive pagination system implemented across all tables in the Hospital Billing System. The system provides consistent pagination functionality with configurable items per page and search capabilities.

## Features

- **Configurable Items Per Page**: Users can select from 5, 10, 25, 50, or 100 items per page
- **Search Integration**: Pagination works seamlessly with existing search functionality
- **Responsive Design**: Pagination controls are mobile-friendly and follow Bootstrap styling
- **Consistent API**: All API endpoints follow the same pagination pattern
- **Reusable Components**: Single pagination utility used across all modules

## Implementation Details

### 1. Pagination Utility (`js/pagination-utility.js`)

The core pagination functionality is provided by the `PaginationUtility` class:

```javascript
const pagination = new PaginationUtility({
    itemsPerPage: 10,
    onPageChange: (page) => {
        loadData(page);
    },
    onItemsPerPageChange: (itemsPerPage) => {
        loadData(1, itemsPerPage);
    }
});
```

#### Key Methods:
- `calculatePagination(totalItems, currentPage, itemsPerPage)`: Calculates pagination data
- `generatePaginationControls(containerId, showItemsPerPage)`: Renders pagination UI
- `getPaginatedData(data, page, itemsPerPage)`: Paginates client-side data
- `resetToFirstPage()`: Resets to first page
- `getCurrentState()`: Returns current pagination state

### 2. API Endpoints

All API endpoints now support pagination parameters:

#### Request Parameters:
- `page`: Current page number (default: 1)
- `itemsPerPage`: Number of items per page (default: 10)
- `search`: Search term for filtering (optional)

#### Response Format:
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "currentPage": 1,
        "itemsPerPage": 10,
        "totalItems": 150,
        "totalPages": 15,
        "startIndex": 1,
        "endIndex": 10
    }
}
```

### 3. Updated Modules

The following modules have been updated with pagination:

#### Patient Records (`module/patient-records.html`)
- **API**: `api/get-patients.php`
- **JavaScript**: `js/patients.js`
- **Features**: Patient list with pagination and search

#### Medicine Management (`module/inv-medicine.html`)
- **API**: `api/get-medicines.php`
- **JavaScript**: `js/medicine.js`
- **Features**: Medicine inventory with pagination

#### User Management (`module/user-management.html`)
- **API**: `api/manage-users.php`
- **JavaScript**: `js/user-management.js`
- **Features**: User accounts with pagination

#### Admission Records (`module/admission-records.html`)
- **API**: `api/get-admissions.php`
- **JavaScript**: `js/admission-records.js`
- **Features**: Patient admissions with pagination

## Usage Instructions

### For Developers

#### 1. Adding Pagination to a New Module

1. **Include the pagination utility**:
```html
<script src="../js/pagination-utility.js" defer></script>
```

2. **Add pagination container** to your HTML:
```html
<div id="pagination-container" class="mt-3"></div>
```

3. **Initialize pagination** in your JavaScript:
```javascript
const pagination = new PaginationUtility({
    itemsPerPage: 10,
    onPageChange: (page) => {
        loadData(page);
    },
    onItemsPerPageChange: (itemsPerPage) => {
        loadData(1, itemsPerPage);
    }
});
```

4. **Update your data loading function**:
```javascript
async function loadData(page = 1, itemsPerPage = 10, search = '') {
    const response = await axios.get('/api/your-endpoint.php', {
        params: {
            operation: 'getData',
            page: page,
            itemsPerPage: itemsPerPage,
            search: search
        }
    });
    
    if (response.data.success) {
        displayData(response.data.data);
        
        // Update pagination controls
        if (response.data.pagination) {
            pagination.calculatePagination(
                response.data.pagination.totalItems,
                response.data.pagination.currentPage,
                response.data.pagination.itemsPerPage
            );
            pagination.generatePaginationControls('pagination-container');
        }
    }
}
```

5. **Update your API endpoint** to support pagination parameters.

#### 2. API Endpoint Structure

```php
function getData($params = []) {
    // Get pagination parameters
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
    $search = isset($params['search']) ? $params['search'] : '';
    
    // Calculate offset
    $offset = ($page - 1) * $itemsPerPage;
    
    // Build WHERE clause for search
    $whereClause = '';
    $searchParams = [];
    
    if (!empty($search)) {
        $whereClause = "WHERE column_name LIKE :search";
        $searchParams[':search'] = "%$search%";
    }

    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM table_name $whereClause";
    $countStmt = $conn->prepare($countSql);
    if (!empty($searchParams)) {
        $countStmt->execute($searchParams);
    } else {
        $countStmt->execute();
    }
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get paginated data
    $sql = "SELECT * FROM table_name $whereClause ORDER BY column_name ASC LIMIT :limit OFFSET :offset";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    
    if (!empty($searchParams)) {
        foreach ($searchParams as $key => $value) {
            $stmt->bindValue($key, $value);
        }
    }
    
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate pagination info
    $totalPages = ceil($totalCount / $itemsPerPage);
    $startIndex = $offset + 1;
    $endIndex = min($offset + $itemsPerPage, $totalCount);

    echo json_encode([
        'success' => true,
        'data' => $data,
        'pagination' => [
            'currentPage' => $page,
            'itemsPerPage' => $itemsPerPage,
            'totalItems' => $totalCount,
            'totalPages' => $totalPages,
            'startIndex' => $startIndex,
            'endIndex' => $endIndex
        ]
    ]);
}
```

### For Users

#### Using Pagination Controls

1. **Items Per Page**: Use the dropdown to select how many items to display per page (5, 10, 25, 50, or 100)
2. **Navigation**: Use the pagination buttons to navigate between pages
3. **Page Numbers**: Click on specific page numbers to jump to that page
4. **Search**: Use the search box to filter results (pagination will work with search results)

#### Pagination Information

The pagination controls show:
- Current page number
- Total number of pages
- Total number of items
- Range of items currently displayed (e.g., "Showing 1 to 10 of 150 entries")

## Technical Specifications

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Bootstrap 5.3.7 for styling

### Performance Considerations
- Server-side pagination reduces memory usage
- Database queries are optimized with LIMIT and OFFSET
- Search functionality uses database indexes for better performance

### Security
- All pagination parameters are validated and sanitized
- SQL injection protection through prepared statements
- Input validation on both client and server side

## Troubleshooting

### Common Issues

1. **Pagination not showing**: Ensure the pagination container exists in HTML
2. **Page not changing**: Check that the pagination utility is properly initialized
3. **API errors**: Verify that pagination parameters are being sent correctly
4. **Search not working**: Ensure search parameters are included in API requests

### Debug Mode

Enable debug mode by adding this to your JavaScript:
```javascript
const pagination = new PaginationUtility({
    itemsPerPage: 10,
    onPageChange: (page) => {
        console.log('Page changed to:', page);
        loadData(page);
    },
    onItemsPerPageChange: (itemsPerPage) => {
        console.log('Items per page changed to:', itemsPerPage);
        loadData(1, itemsPerPage);
    }
});
```

## Future Enhancements

1. **Advanced Filtering**: Add date range filters and multiple search criteria
2. **Export Functionality**: Export paginated data to CSV/Excel
3. **Bulk Operations**: Select multiple items across pages for bulk actions
4. **Caching**: Implement client-side caching for better performance
5. **Infinite Scroll**: Alternative to pagination for mobile devices

## Support

For technical support or questions about the pagination implementation, please refer to the code comments or contact the development team.
