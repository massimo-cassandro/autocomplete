import autoComplete from '@tarekraafat/autocomplete.js';
// import { escapeHTML } from '@massimo-cassandro/js-utilities';

// https://tarekraafat.github.io/autoComplete.js/#/configuration


export default function (params = {}) {

  try {

    const default_params = {
        placeholder: 'Inserisci tre o più caratteri',
        ac_url: null, // url di ricerca, deve avere slash iniziali e finali

        // se true, non viene concatenata la stringa di ricerca all'url (utile se si usa un json)
        test_mode: false,

        /*
          funzione che riceve il risultato del fetch ajax e restituisce un array
          di oggetti nella forma
          {
            id             <== id dell'elemento
            val            <== valore da visualizzare come risultato della selezione
            list_display   <== stringa visualizzata nell'elenco
          }

          esempio:
          data => data.map(item => {
            return {
              id: item.id,
              val: `#${item.id} ${item.agenzia} (${item.network})`,
              list_display: `#${item.id} ${item.agenzia} (${item.network})`+
                (item.ragioneSociale? `<br><small>${item.ragioneSociale}</small>` : '—')
            };
          });
        */
        fetch_result_function: data => data,

        // elemento o funzione che restituisce l'elemento
        autocomplete_field: null,

        // oggetto opzione di parametri da accodare all'url di ricerca in modalità get
        extra_query_params: {},

        // name e id dell'elemento hidden su cui registrare l'id selezionato
        // il `name` non viene utilizzato se l'elemento è già presente
        hidden_name: null,
        hidden_id: null,

        // elemento hidden, se presente `hidden_name` e `hidden_id` non vengono presi in considerazione
        hidden_field: null,

        // se presente utilizza l'elemento select (già esistente) indicato
        // se impostato, `hidden_name` e `hidden_id` vengono ignorati
        // l'elemento select è considerato di tipo `multiple` se `select_multiple == true`
        // nel caso di select multiple non è possibile inserire due voci con lo stesso id
        select_id: null,
        select_multiple: true,

        // id dell'elemento in cui generare i badge delle opzioni selezionate
        // Solo se `select_id` è impostato, per visualizzazione ed editing delle voci scelte.
        // Se non presente, viene ignorato ma è necessario predisporre autonomanente
        // la procedura di editing
        // NB: solo per select multiple
        select_badges_id: null,

        // callback invocato quando un badge viene rimosso
        // viene invocato con argomenti l'id e la voce (il testo del badge) dell'elemento rimosso
        badges_remove_callback: null,


        // callback autocomplete
        // se presente viene invocato con tre argomenti: id, val e autocomplete field
        callback: null
      },

      // crea il badge per l'opzione con select multiple
      make_badge = (id, text) => {
        return `<span class="badge rounded-pill text-bg-secondary ac-badge">
          <span>${text}</span>
          <button type="button" class="ac-badge-btn" data-id="${id}">&times;</button>
        </span>`;
      };

    params = {...default_params, ...params};


    if(params.autocomplete_field && params.ac_url) {

      if(typeof params.autocomplete_field === 'function') {
        params.autocomplete_field = params.autocomplete_field();
      }

      // impostazione attributi autocomplete
      params.autocomplete_field.type = 'search';
      ['spellcheck=false', 'autocorrect=off', 'autocomplete=off', 'autocapitalize=off'].forEach(item => {
        const [attr, val] = item.split('=');
        params.autocomplete_field.setAttribute(attr, val);
      });

      params.autocomplete_field.dataset.sel = params.autocomplete_field.value;


      params.autocomplete_field.closest('.form-group').classList.add('ac-autocomplete-wrapper');

      let extra_query_params = [];
      for(const i in params.extra_query_params) {
        if(Array.isArray(params.extra_query_params[i])) {
          params.extra_query_params[i].forEach(item => {
            extra_query_params.push(`${i}[]=${item}`);
          });
        } else {
          extra_query_params.push(`${i}=${params.extra_query_params[i]}`);
        }
      }
      const extra_query_params_string = extra_query_params.length? `?${extra_query_params.join('&')}` : '';

      let hidden_field = null, select_field = null, badges_container = null;

      if(params.select_id) {
        select_field = document.getElementById(params.select_id);
        if(!select_field) {
          throw `Elemento '${params.select_id}' non presente`;
        }
        if(params.select_badges_id) {
          badges_container = document.getElementById(params.select_badges_id);
        }

      } else {
        // campo hidden
        // se non presente, viene generato
        if(params.hidden_field) {
          hidden_field = params.hidden_field;

        } else {
          hidden_field = document.getElementById(params.hidden_id);
          if(!hidden_field) {
            params.autocomplete_field.insertAdjacentHTML('afterend',
              `<input type="hidden" id="${params.hidden_id}" name="${params.hidden_name}" value="">`
            );
            hidden_field = document.getElementById(params.hidden_id);
          }
        }
      }

      const autoCompleteJS = new autoComplete({
        selector: '#' + params.autocomplete_field.id,
        placeHolder: params.placeholder,
        diacritics: true,
        threshold: 3,
        data: {
          src: async (query) => {
            const ac_url = app_data.baseUrl + params.ac_url +
              (params.test_mode? '' : encodeURIComponent(query)) + extra_query_params_string;


            try {
              // Fetch Data from external Source
              const source = await fetch(ac_url);
              // Data is array of `Objects` | `Strings`
              const data = await source.json();

              return params.fetch_result_function(data);

            } catch (error) {
              return error;
            }
          },
          // Data 'Object' key to be searched
          keys:['list_display'],
          cache: false
        },
        resultsList: {
          destination: '#' + params.autocomplete_field.id,
          element: (list, data) => {
            if (!data.results.length) {
              // Create "No Results" message element
              const message = document.createElement('div');
              // Add class to the created element
              message.setAttribute('class', 'no-result');
              // Add message text content
              message.innerHTML = `<span>Nessun risultato per <strong>"${data.query}"</strong></span>`;
              // Append message element to the results list
              list.prepend(message);
            }
          },
          noResults: true,
        },
        resultItem: {
          highlight: true,
        },
        events: {
          input: {
            selection: (event) => {
              const selected_id = event.detail.selection.value.id,
                selected_text = event.detail.selection.value.val;

              autoCompleteJS.input.value = selected_text;

              if(select_field) {
                const option_element = new Option(selected_text, selected_id, true, true);

                if(params.select_multiple) {
                  // impedisce i doppioni
                  if(!select_field.querySelector(`option[value="${selected_id}"]`)) {

                    select_field.appendChild(option_element);
                    params.autocomplete_field.value = '';

                    if(badges_container) {
                      badges_container.insertAdjacentHTML('beforeend',
                        make_badge(selected_id, selected_text)
                      );
                    }
                  }

                } else { // select singolo
                  select_field.innerHTML = '';
                  select_field.appendChild(option_element);
                }

              } else {
                hidden_field.value = selected_id;
              }

              autoCompleteJS.input.dataset.sel = selected_text;

              if(params.callback && typeof params.callback === 'function') {
                params.callback(selected_id, selected_text, autoCompleteJS.input);
              }
            }
          }
        }
      }); // end autoComplete

      // TODO
      // migliorare, rendere più efficiente la chiamata del callback

      // reset hidden
      const check_ac = () => {
        if(params.autocomplete_field.value === '' ||
          (params.autocomplete_field.dataset.sel !== undefined &&
            params.autocomplete_field.value !== params.autocomplete_field.dataset.sel)
        ) {
          if(hidden_field) {
            hidden_field.value = '';
          }
          if(select_field && !params.select_multiple) {
            select_field.innerHTML = '';
          }
          if(params.callback && typeof params.callback === 'function') {
            params.callback('', '', params.autocomplete_field);
          }
        }
      };

      params.autocomplete_field?.addEventListener('search', () => {
        check_ac();
      }, false);
      params.autocomplete_field?.addEventListener('blur', () => {
        check_ac();
      }, false);
      params.autocomplete_field?.addEventListener('change', () => {
        check_ac();
      }, false);
      params.autocomplete_field?.addEventListener('keydown', () => {
        check_ac();
      }, false);

      // listener su badges
      badges_container?.addEventListener('click', e => {
        const btn = e.target.closest('.ac-badge-btn');

        if(btn) {
          btn.closest('.ac-badge').remove();
          select_field.querySelector(`option[value="${btn.dataset.id}"]`).remove();

          if(params.badges_remove_callback && typeof badges_remove_callback === 'function') {
            params.badges_remove_callback(btn.dataset.id, btn.querySelector(':scope > span').innerText);
          }
        }
      }, false);

      // aggiunta voci o badges di eventuali valori preregistrati
      if(select_field) {

        if(params.select_multiple && badges_container) {
          select_field.querySelectorAll('option').forEach(option => {
            badges_container.insertAdjacentHTML('beforeend',
              make_badge(option.value, option.innerHTML)
            );
          });
        } else {
          params.autocomplete_field.value = select_field.querySelector('option')?.innerText?? '';
        }

      }


    } // end if params.autocomplete_field...

  } catch(e) {
    console.error( e ); // eslint-disable-line
  }
}
