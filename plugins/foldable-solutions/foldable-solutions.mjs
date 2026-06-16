export default {
  render({ model, el }) {

    //////////////////////////////////////////////////////////////////////////
    // Build the UI
    const sliderContainer = document.createElement('div');
    sliderContainer.classList.add('slider-container');

    const solutionSlider = slider(document,
      'show-solutions',
      model.get("solutionsSliderLabel") ?? "Solutions",
      model.get("solutionsSliderTooltip") ?? "Toggle to display the reference solutions for all exercises",
      'solutions-toggle')
    console.log(model);
    const notesSlider = slider(
      document,
      'show-notes',
      model.get("notesSliderLabel") ?? "Instructor notes",
      model.get("notesSliderTooltip") ?? "Toggle to display the instructor notes",
      'notes-toggle')

    sliderContainer.appendChild(solutionSlider);
    sliderContainer.appendChild(notesSlider);

    // el.appendChild(sliderContainer);


    // 1. Assume sliderContainer is your pre-defined element
    // (If it's a string of HTML, you'd need to convert it to a DOM element first)
    //const sliderContainer = document.createElement('div'); 
    //sliderContainer.innerHTML = '<!-- Your slider content here -->';
    //sliderContainer.className = 'my-slider-widget';

    // 2. Find the search button by its class
    const searchButton = document.querySelector('.myst-search-bar');

    if (searchButton) {
      // 3. Get the parent element (the horizontal tool bar div)
      const parentToolbar = searchButton.parentNode;

      // 4. Insert the sliderContainer immediately before the searchButton
      parentToolbar.insertBefore(sliderContainer, searchButton);
    
      console.log("Slider widget successfully inserted before search bar.");
    } else {
      console.error("Could not find the element with class 'myst-search-bar'.");
    }

    //////////////////////////////////////////////////////////////////////////
    // Mark and fold solutions

    makeFoldable("BEGIN SOLUTION", "END SOLUTION", "Solution", "consultée", "alert alert-success solution");
    makeFoldable("HIDDEN TEST", "END HIDDEN TEST", "Tests cachés", "consultés", "hidden-tests");

    const onSolutionsToggle = (event) => {
      const open = event?.detail?.open;
      if (typeof open === 'boolean') {
        for (let detail of document.querySelectorAll(".solution")) {
          detail.open = open;
        }
      }
    };

    window.addEventListener('solutions-toggle', onSolutionsToggle);

    //////////////////////////////////////////////////////////////////////////
    // Mark and fold instructor notes

    // Search for admonitions containing one of the configured titles"
    const notes = searchForNotes(document, model.get("notesTitles"))
    notes.forEach(note => {
      note.style.display = 'none';
    });

    const applyNotesVisibility = (show) => {
      notes.forEach(note => {
	//throw new Error("test");
	console.log(show, note);
        note.style.display = show ? 'block' : 'none';
      });
    };

    const onNotesToggle = (event) => {
      applyNotesVisibility(event?.detail?.open);
    };

    window.addEventListener('notes-toggle', onNotesToggle);

    return () => {
      sliderContainer.remove();
    };
  },
};

function searchForNotes(document, titles) {
    return Array.from(document.querySelectorAll('.myst-admonition')).filter(note => {
      const titleElement = note.querySelector('.myst-admonition-header-text');
      return titleElement && titles.some(s => titleElement.textContent.includes(s));
    });
}


/**
 * Add a switch with persistence to control whether a feature is shown or not
 * @parent: the switch will be inserted as first child of that parent
 * @id: a unique html id
 * @label: the user visible label for the switch
 * @show: a function taking a boolean and shows/hides accordingly the feature
 **/
function slider(document, id, label, tooltip, eventId) {
  // 1. Create the main container for the slider group
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'myst-slider-wrapper';
  sliderContainer.style.display = 'inline-flex';
  sliderContainer.style.alignItems = 'center';
  sliderContainer.style.marginRight = '10px';

  // 2. Create the Tooltip element
  const tooltipEl = document.createElement('span');
  tooltipEl.className = 'myst-tooltip';
  tooltipEl.innerText = tooltip;
  tooltipEl.title = tooltip; // Standard browser tooltip
  // Optional: add a custom class for CSS styling of the tooltip
  tooltipEl.style.cursor = 'help';
  tooltipEl.innerHTML = `<span>ⓘ</span>`; // Adding a small info icon

  // 3. Create the Label
  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.innerText = label;
  labelEl.style.marginRight = '5px';
  labelEl.style.cursor = 'pointer';

  // 4. Create the Boolean Slider (Checkbox)
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  // checkbox.className = 'myst-boolean-slider';
  // checkbox.style.cssText  = `
  //   appearance: none;
  //   width: 40px;
  //   height: 20px;
  //   background: #ccc;
  //   border-radius: 20px;
  //   position: relative;
  //   cursor: pointer;
  //   outline: none;
  //   transition: 0.3s;
  // `;

  // 5. Assemble everything into the container
  // Order: Tooltip -> Label -> Slider
  sliderContainer.appendChild(tooltipEl);
  sliderContainer.appendChild(labelEl);
  sliderContainer.appendChild(checkbox);

  checkbox.addEventListener('change', () => {
    const checked = checkbox.checked;
    sessionStorage.setItem(id, checked);
    window.dispatchEvent(new CustomEvent(eventId, { detail: { open: checked } }));
  });


  return sliderContainer;
}


function makeFoldable(startString, stopString, title, shownTitle, classes) {
    const starts = Array.from(document.querySelectorAll("p, span")).filter(solution => {
      return solution.innerHTML.includes(startString);
    });
    const stops = Array.from(document.querySelectorAll("p, span")).filter(solution => {
      return solution.innerHTML.includes(stopString);
    });

    for ( let i = 0; i < starts.length; i++ ) {
      let start = starts[i];
      let stop = stops[i];
      console.log("zones: ", start.innerHTML, stop.innerHTML);
      let parent = start.parentNode;

      // This did happen a couple times; a node disconnected from the DOM?
      if ( parent == null ) break;

      let startindex = Array.prototype.indexOf.call(parent.childNodes, start);
      let stopindex = Array.prototype.indexOf.call(parent.childNodes, stop);

      let range = new Range();
      range.setStart(parent, startindex);
      range.setEnd(parent, stopindex);

      let details = document.createElement("details");
      details.className = classes;
      range.surroundContents(details);
      start.remove();
      stop.remove();
      details.innerHTML = "<summary>"+title+"<span class='consult' hidden=''> (<b>"+shownTitle+"</b>)</span></summary>" + details.innerHTML;
      details.style.cssText = `
      background-color: #d1e7dd;
      border-radius: 6px;
      color: #0a3622;
      position: relative;
      padding: 0px 0px;
      border: none;
      cursor: pointer;
      `;

      details.addEventListener("toggle", function() {
        if (details.open) {
          details.firstChild.lastChild.hidden = false
        }
      })
            
    }
}
