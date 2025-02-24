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

              // opzionale:
              __xxx__: item (o altri dati custom)
            };
          });
        */
      fetch_result_function: data => data,

      // elemento o funzione che restituisce l'elemento
      autocomplete_field: null,

      // oggetto opzione di parametri da accodare all'url di ricerca in modalità get
      // i valori delle chiavi possono essere singole stringhe o numeri oppure array
      // es. {param1: 'val1', param2: ['val2'. 'val3']}
      extra_query_params: {},

      // name e id dell'elemento hidden su cui registrare l'id selezionato
      // il `name` non viene utilizzato se l'elemento è già presente
      // se nessuno tra hidden_id, hidden_field e select_id è presente, l'id del valore selezionato non viene gestito
      hidden_name: null,
      hidden_id: null,

      // elemento hidden; se impostato e se presenti, `hidden_name` e `hidden_id` non vengono presi in considerazione
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
      badges_container_id: null,

      // callback invocato quando un badge viene rimosso
      // viene invocato con argomenti l'id e la voce (il testo del badge) dell'elemento rimosso
      badges_remove_callback: null,

      // funzione personalizzata per la costruzione dei badge
      // viene invocata con argomenti `event.detail.selection.value`, e l'oggetto `params`.
      // Il primo corrisponde all'oggetto ritornato da `fetch_result_function`
      // se `null`, viene utilizzato il markup di default
      // NB: al momento, nel caso di elementi preregistrati, il primo argomento di badges_builder
      // contiene solo gli elementi `id`, `val`
      // NB: è necessario che il badge abbia classe `ac-badge` e attributo `data-id`.
      // La funzione deve restituire il markup completo del badge
      badges_builder: null,

      // classe assegnata allo span che contiene il testo del badge
      badge_label_class: 'ac-badge-label',

      // classe assegnata al pulsante di rimozione del badge
      badge_btn_class: 'ac-badge-btn',


      // callback autocomplete
      // se presente viene invocato con 5 argomenti: id, val, autocomplete field element, list_display (outerHTML) e row
      // NB: row viene istanziato solo dopo la selezione di un'opzione
      callback: null,

      // classe aggiuntiva opzionale per la lista dei risultati
      resultList_extra_class: null,

      // classe aggiuntiva opzionale per il wrapper esterno
      wrapper_extra_class: null
    };



    params = {...default_params, ...params};

    params.badges_builder ??= (result_obj, params) => `<span class="ac-badge badge rounded-pill text-bg-secondary" data-id="${result_obj.id}">` +
      `<span class="${params.badge_label_class}">${result_obj.val}</span>` +
        `<button type="button" class="${params.badge_btn_class}">&times;</button>` +
      '</span>';


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
      if(params.wrapper_extra_class) {
        params.autocomplete_field.closest('.form-group').classList.add(params.wrapper_extra_class);
      }

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
        if(params.badges_container_id) {
          badges_container = document.getElementById(params.badges_container_id);
        }

      } else {
        // campo hidden
        // se non presente, viene generato
        if(params.hidden_field) {
          hidden_field = params.hidden_field;

        } else if(params.hidden_id) {
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
            const ac_url = params.ac_url +
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
          class: params.resultList_extra_class,

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
              // console.log(event.detail.selection.value);

              const selected_id = event.detail.selection.value.id,
                selected_text = event.detail.selection.value.val;

              autoCompleteJS.input.value = selected_text;

              if(select_field) {
                const option_element = new Option(selected_text, selected_id, true, true);

                if(params.select_multiple) {
                  // impedisce i doppioni
                  const registered_option = select_field.querySelector(`option[value="${selected_id}"]`),
                    new_badge = params.badges_builder(event.detail.selection.value, params);

                  if(!registered_option) {

                    select_field.appendChild(option_element);
                    params.autocomplete_field.value = '';

                    if(badges_container) {
                      badges_container.insertAdjacentHTML('beforeend', new_badge);
                    }

                  // replace del badge per avere sempre la versione più recente
                  } else {
                    registered_option.replaceWith(option_element);
                    if(badges_container) {
                      const prev_badge = badges_container.querySelector(`.ac-badge[data-id="${selected_id}"]`);
                      prev_badge.replaceWith(
                        new DOMParser().parseFromString(new_badge, 'text/html').body.childNodes[0]
                      );
                    }
                  }

                } else { // select singolo
                  select_field.innerHTML = '';
                  select_field.appendChild(option_element);
                }

              } else if (hidden_field) {
                hidden_field.value = selected_id;
              }

              autoCompleteJS.input.dataset.sel = selected_text;

              if(params.callback && typeof params.callback === 'function') {
                params.callback(selected_id, selected_text, autoCompleteJS.input, event.detail.selection.value.list_display, event.detail.selection.value.row);
              }
            }
          }
        }
      }); // end autoComplete

      // TODO[epic=autocomplete]
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
        const btn = e.target.closest(`.${params.badge_btn_class}`);

        if(btn) {
          const badge = btn.closest('.ac-badge'),
            item_id = badge.dataset.id,
            item_text = badge.querySelector(':scope > span').innerText;
          badge.remove();
          select_field.querySelector(`option[value="${item_id}"]`).remove();

          if(params.badges_remove_callback && typeof params.badges_remove_callback === 'function') {

            params.badges_remove_callback(item_id, item_text);
          }
        }
      }, false);

      // aggiunta voci o badges di eventuali valori preregistrati
      if(select_field) {

        if(params.select_multiple && badges_container) {
          // eventuali attributi data dell'option vengono aggiunti
          // alla funzione `badges_builder`, con chiave `dataset`

          select_field.querySelectorAll('option').forEach(option => {
            badges_container.insertAdjacentHTML('beforeend',

              params.badges_builder({id: option.value, val: option.innerHTML, dataset: {...option.dataset}}, params)
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
