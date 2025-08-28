/**
 * Pagination Utility for Hospital Billing System
 * Provides reusable pagination functionality for all tables
 */

class PaginationUtility {
    constructor(options = {}) {
        this.currentPage = 1;
        this.itemsPerPage = options.itemsPerPage || 10;
        this.totalItems = 0;
        this.totalPages = 0;
        this.onPageChange = options.onPageChange || (() => { });
        this.onItemsPerPageChange = options.onItemsPerPageChange || (() => { });

        // Available items per page options
        this.itemsPerPageOptions = [5, 10, 25, 50, 100];
    }

    /**
     * Calculate pagination data
     */
    calculatePagination(totalItems, currentPage = 1, itemsPerPage = null) {
        if (itemsPerPage !== null) {
            this.itemsPerPage = itemsPerPage;
        }

        this.totalItems = totalItems;
        this.currentPage = currentPage;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);

        // Ensure current page is within bounds
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages || 1;
        }

        return {
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            totalPages: this.totalPages,
            startIndex: (this.currentPage - 1) * this.itemsPerPage,
            endIndex: Math.min(this.currentPage * this.itemsPerPage, this.totalItems)
        };
    }

    /**
     * Generate pagination controls HTML
     */
    generatePaginationControls(containerId, showItemsPerPage = true) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '';

        // Items per page selector
        if (showItemsPerPage) {
            html += `
                <div class="d-flex align-items-center mb-3">
                    <label class="me-2">Show:</label>
                    <select class="form-select form-select-sm me-3" style="width: auto;" id="itemsPerPageSelect">
                        ${this.itemsPerPageOptions.map(option =>
                `<option value="${option}" ${this.itemsPerPage === option ? 'selected' : ''}>${option}</option>`
            ).join('')}
                    </select>
                    <span class="text-muted">entries</span>
                </div>
            `;
        }

        // Pagination info
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

        html += `
            <div class="d-flex justify-content-between align-items-center">
                <div class="text-muted">
                    Showing ${startIndex} to ${endIndex} of ${this.totalItems} entries
                </div>
                <nav aria-label="Table pagination">
                    <ul class="pagination pagination-sm mb-0">
        `;

        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page
        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <button class="page-link" data-page="1">1</button>
                </li>
            `;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        // Last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `
                <li class="page-item">
                    <button class="page-link" data-page="${this.totalPages}">${this.totalPages}</button>
                </li>
            `;
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <button class="page-link" data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;

        html += `
                    </ul>
                </nav>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners
        this.addPaginationEventListeners();
    }

    /**
     * Add event listeners to pagination controls
     */
    addPaginationEventListeners() {
        // Page change buttons
        document.querySelectorAll('.page-link[data-page]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(button.dataset.page);
                if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
                    this.currentPage = page;
                    this.onPageChange(this.currentPage);
                }
            });
        });

        // Items per page selector
        const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                const newItemsPerPage = parseInt(e.target.value);
                if (newItemsPerPage !== this.itemsPerPage) {
                    this.itemsPerPage = newItemsPerPage;
                    this.currentPage = 1; // Reset to first page
                    this.onItemsPerPageChange(this.itemsPerPage);
                }
            });
        }
    }

    /**
     * Get paginated data from an array
     */
    getPaginatedData(data, page = null, itemsPerPage = null) {
        if (page !== null) this.currentPage = page;
        if (itemsPerPage !== null) this.itemsPerPage = itemsPerPage;

        const pagination = this.calculatePagination(data.length, this.currentPage, this.itemsPerPage);

        return {
            data: data.slice(pagination.startIndex, pagination.endIndex),
            pagination: pagination
        };
    }

    /**
     * Update pagination controls
     */
    updatePaginationControls(containerId, showItemsPerPage = true) {
        this.generatePaginationControls(containerId, showItemsPerPage);
    }

    /**
     * Reset pagination to first page
     */
    resetToFirstPage() {
        this.currentPage = 1;
    }

    /**
     * Get current pagination state
     */
    getCurrentState() {
        return {
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            totalPages: this.totalPages
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaginationUtility;
}
