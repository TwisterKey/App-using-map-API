'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //+'' convert to string
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, long]
    this.distance = distance; //in km
    this.duration = duration; //in m
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

/////////////////////////////////////////////////////////
//ARHITECTURA APLICATIEI
class App {
  #map;
  #mapEvent;
  #workouts = [];
  constructor() {
    //luam pozitia userilor
    this.#getpostion();

    //luam datele din localstorage
    this.#getLocalStorage();

    //events handlers
    form.addEventListener('submit', this.#newWorkout.bind(this)); //primul this o sa arate catre form

    inputType.addEventListener('change', this.#toggleEelevationField);

    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
  }

  #getpostion() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadmap.bind(this), // o sa returneze o noua functie(regular function not method function , this e setat pe undefined, this-ul din bind arata catre obiectul curent)
        function () {
          alert('Nu-ti putem lua pozitia');
        }
      );
    }
  }

  #loadmap(position) {
    console.log(position);
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.log(latitude, longitude);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    this.#map = L.map('map').setView([latitude, longitude], 13);
    console.log(this); //fara #loadmap.bind(this) era undefined
    console.log(this.#map); //vedem tooate functiile
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //handling stick on map
    this.#map.on('click', this.#showform.bind(this)); //daca nu scriam .bind atunci showform facea referire la #map, vrem ca this sa fie APP OBJECT
    this.#workouts.forEach(workout => this.#renderWorkoutMarker(workout)); //prima data trebuie sa-si faca load mapa si abia dupa sa se adauge markul
  }

  #showform(mapE) {
    this.#mapEvent = mapE;
    console.log(this.#mapEvent);
    form.classList.remove('hidden');
    inputDistance.focus(); // ne pune cu cursorul pe el
  }

  #toggleEelevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); //selects parents --- cand e running se afiseaza step/min
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden'); //selects parents --- cand e cycling se afiseaza meters
  }

  #hideForm() {
    //empty inputs
    inputDistance.value =
      inputElevation.value =
      inputDuration.value =
      inputCadence.value =
        ' ';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPozitive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; //+ convert to number
    const duration = +inputDuration.value;
    let workout;

    //if workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPozitive(distance, duration, cadence)
      )
        return alert('Input trebuie sa fie un numar pozitiv!');
      workout = new Running(
        [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng],
        distance,
        duration,
        cadence
      );
      this.#workouts.push(workout);
      console.log(workout);
    }

    //if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(elevation)
        !validInputs(distance, duration, elevation) ||
        !allPozitive(distance, duration) //elevation poate sa fie negativa(cobori un munte)
      )
        return alert('Input trebuie sa fie un numar pozitiv!');
      workout = new Cycling(
        [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng],
        distance,
        duration,
        elevation
      );
      this.#workouts.push(workout);
      console.log(workout);
    }

    //add new object to workout array

    //render workout on map as a marker
    this.#renderWorkoutMarker(workout);

    //render workout on list
    this.#renderworkout(workout);

    //hide form + clear input list
    this.#hideForm();

    //set local storage to all workouts
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          mindWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }) //creeam markerul de pe harta la coordonatele la care am dat click
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  #renderworkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li> -->`;
    }

    form.insertAdjacentHTML('afterend', html); // adauga elementul ca pe un sibling
  }
  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout'); // pe orice chetie am da click ne duce la parinte, ne duce la tot elementul, cand apasam in afara elementului creat se afiseaza null
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);
    console.log(workoutEl.dataset.id);

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    }); //13 este zoomul
    // workout.click();
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  } //localstorage este API, workouts e un 'key', salvam sub forma de JSON workouturile

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); //opusul lui stringify
    console.log(data);

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(workout => this.#renderworkout(workout));
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
