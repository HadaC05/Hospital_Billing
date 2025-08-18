// Universal Search and Filter Utility Functions
// This utility provides reusable search and filter functionality for all modules

class SearchFilterManager {
    constructor(config) {
        this.data = [];
        this.filteredData = [];
        this.searchInputId = config.searchInputId;
        this.filterSelects = config.filterSelects || [];
        this.renderFunction = config.renderFunction;
        this.searchFields = config.searchFields || [];
        
        this.initEventListeners();
    }

    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.renderFunction(this.filteredData);
    }

    initEventListeners() {
        // Search input listener
        const searchInput = document.getElementById(this.searchInputId);
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Filter select listeners
        this.filterSelects.forEach(filterId => {
            const filterSelect = document.getElementById(filterId);
            if (filterSelect) {
                filterSelect.addEventListener('change', () => this.applyFilters());
            }
        });
    }

    applyFilters() {
        const searchTerm = document.getElementById(this.searchInputId)?.value.toLowerCase() || '';
        
        this.filteredData = this.data.filter(item => {
            // Apply search filter
            const matchesSearch = this.searchFields.some(field => {
                const value = this.getNestedValue(item, field);
                return value && value.toString().toLowerCase().includes(searchTerm);
            });

            // Apply dropdown filters
            const matchesFilters = this.filterSelects.every(filterId => {
                const filterValue = document.getElementById(filterId)?.value;
                if (!filterValue) return true;

                const filterField = this.getFilterField(filterId);
                const itemValue = this.getNestedValue(item, filterField);
                return itemValue == filterValue;
            });

            return matchesSearch && matchesFilters;
        });

        this.renderFunction(this.filteredData);
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    getFilterField(filterId) {
        // Map filter IDs to data fields
        const fieldMap = {
            'filterMedicineType': 'med_type_id',
            'filterMedicineStatus': 'is_active',
            'filterLabtestCategory': 'labtest_category_id',
            'filterLabtestStatus': 'is_active',
            'filterSurgeryType': 'surgery_type_id',
            'filterSurgeryStatus': 'is_available',
            'filterRoomType': 'room_type_id',
            'filterRoomStatus': 'is_active',
            'filterTreatmentType': 'treatment_type_id',
            'filterTreatmentStatus': 'is_active'
        };
        return fieldMap[filterId] || '';
    }
}

// Export for use in modules
window.SearchFilterManager = SearchFilterManager;
