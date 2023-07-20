// TODO trigger ac selection?
export function checkAutocomplete(autocomplete_field, hidden_field) {
  if(autocomplete_field && hidden_field) {
    if(autocomplete_field.value === '' || autocomplete_field.value.toLowerCase() !== autocomplete_field.dataset.sel.toLowerCase()) {
      autocomplete_field.value = '';
      hidden_field.value = '';
    }
  }
}
