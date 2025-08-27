// This file contains UI helper functions and utilities

// Function to show a notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
}

// Function to format date
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-PH', options);
}

// Function to validate form
function validateForm(formId) {
  const form = document.getElementById(formId);
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('is-invalid');
      isValid = false;
    } else {
      input.classList.remove('is-invalid');
    }
  });
  
  return isValid;
}

// Function to reset form
function resetForm(formId) {
  const form = document.getElementById(formId);
  form.reset();
  
  // Remove validation classes
  const inputs = form.querySelectorAll('.is-invalid, .is-valid');
  inputs.forEach(input => {
    input.classList.remove('is-invalid', 'is-valid');
  });
}

// Function to show loading spinner
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  element.innerHTML = `
    <div class="d-flex justify-content-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
}

// Function to hide loading spinner
function hideLoading(elementId, originalContent) {
  const element = document.getElementById(elementId);
  element.innerHTML = originalContent;
}

// Function to confirm action (SweetAlert2)
function confirmAction(message) {
  // Returns a Promise<boolean>
  return Swal.fire({
    title: 'Are you sure?',
    text: message || 'Please confirm your action.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No'
  }).then(result => !!result.isConfirmed);
}

// Function to disable button
function disableButton(buttonId) {
  const button = document.getElementById(buttonId);
  button.disabled = true;
  button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
}

// Function to enable button
function enableButton(buttonId, originalText) {
  const button = document.getElementById(buttonId);
  button.disabled = false;
  button.innerHTML = originalText;
}

// Function to set active navigation
function setActiveNav(navId) {
  // Remove active class from all nav items
  document.querySelectorAll('.nav-link').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to selected nav item
  document.getElementById(navId).classList.add('active');
}

// Function to show/hide sections
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected section
  document.getElementById(sectionId).style.display = 'block';
}

// Function to populate select dropdown
function populateSelect(selectId, options, valueField, textField) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Select...</option>';
  
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option[valueField];
    optionElement.textContent = option[textField];
    select.appendChild(optionElement);
  });
}

// Function to create table from data
function createTableFromData(containerId, data, columns) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (data.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No data available</p>';
    return;
  }
  
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column.title;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(column => {
      const td = document.createElement('td');
      
      if (column.render) {
        td.innerHTML = column.render(row, column.field);
      } else {
        td.textContent = row[column.field] || '';
      }
      
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  
  container.appendChild(table);
}