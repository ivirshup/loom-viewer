
/**
 * Crude normal curve approximation by taking the average of 4 random values.
 * Returns random value between (-0.5, 0.5)
 */
const { random } = Math;
export function rndNorm() {
	return (random() + random() - random() - random()) * 0.25;
}


// expects two number arrays of [xmin, ymin, xmax, ymax].
export function inBounds(r1, r2) {
	return (
		r1[0] < r2[2] && // r1.xmin < r2.xmax
		r2[2] < r1[2] && // r2.xmin < r1.xmax
		r1[1] < r2[3] && // r1.ymin < r2.ymax
		r2[1] < r1[3]    // r2.ymin < r1.ymax
	);
}

/**
 * Returns array of all unique values as `{ val, count }`
 * objects. Sorted by `val`.
 */
export function countElements(array, start, end) {
	start = start > 0 ? start : 0;
	end = end < array.length ? end : array.length;
	// Copy and sort the array. Note that after sorting,
	// undefined values will be at the end of the array!
	let sorted = array.slice(start, end);
	sorted.sort();

	// skip undefined elements
	let i = sorted.indexOf(undefined);
	if (i !== -1) {
		end = i;
	}
	i = end - 1;

	// By using a sentinel value we can skip counting the
	// smallest element of the array.
	// Many gene arrays contain mostly zeros, which will
	// be at the front, so this can save a bit of time.
	let val = sorted[i], sentinel = sorted[start], j = i, uniques = [];
	while (val !== sentinel) {
		// keep going until a different value is found
		while (--j >= start && sorted[j] === val) { }
		uniques.push({ val, count: i - j });
		i = j;
		val = sorted[j];
	}
	// add skipped first value
	uniques.push({ val, count: j + 1 });

	return uniques;
}

export function findMostCommon(array, start, end) {
	start = start > 0 ? start : 0;
	end = end < array.length ? end : array.length;
	let i = 0, j = 0, sorted = array.slice(start, end).sort(),
		val = sorted[i], mv = val, mc = 1;
	// linearly run through the array, count unique values
	while (val !== null && val !== undefined) {
		// keep going until a different value is found
		while (sorted[++j] === val) { }
		if (j - i > mc) {
			mv = val;
			mc = j - i;
		}
		i = j;
		val = sorted[j];
	}
	return mv;
}

// assumes no NaN values!
export function calcMinMax(data, start, end) {
	start = start || 0;
	end = end || data.length;

	let min, max;
	let i = end - 1;
	let v = data[i];
	if (typeof v === 'number') {
		min = max = v;
		while (start < i--) {
			const v = data[i];
			min = min < v ? min : v;
			max = max > v ? max : v;
		}
	}
	return { min, max };
}

/**
 * Tests if all values in an array are integer values
 * and finds min and max values of the array.
*/
export function isIntegerMinMax(array) {
	let min, max, isInt;
	let i = array.length - 1;
	let v = array[i];
	if (typeof v === 'number') {
		min = max = v;
		isInt = v === (v | 0);
		while (i--) {
			const v = array[i];
			if (v < min) { min = v; }
			if (v > max) { max = v; }
			isInt = isInt && v === (v | 0);
		}
	}
	return { min, max, isInt };	// |0 forces to integer value, we can
}


// === Metadata Arrays ===
// Instead of plain arrays, we wrap the data from our attributes
// and genes in an object containing useful metadata about them.
// This includes array type (typed arrays are much faster
// to use, and we also have a special format for indexed strings)
// to which attribute and dataset the data belongs, min and max
// value, which twenty values are most common, by how much,
// whether they are filtered, and a color indices LUT matching
// these common values


// Convert plain array to object with
// typed/indexed array and metadata
export function convertJSONarray(arr, name) {
	let { arrayType, data, indexedVal, uniques,
		colorIndices, min, max } = arr;

	if (indexedVal) {
		indexedVal.unshift(null);
	}

	let retArr = {
		name, arrayType, indexedVal,
		uniques, colorIndices, min, max,
	};

	retArr.data = indexedVal ? Uint8Array.from(data) : arrayConstr(arrayType).from(data);

	if (uniques.length === 1 && uniques[0].count === data.length) {
		retArr.uniqueVal = data[0];
	} else if (uniques.length === 0 || uniques.length === data.length) {
		retArr.allUnique = true;
	}

	if (process.env.NODE_ENV !== 'production') {
		// redux tools trips over gigantic typed arrays
		const reduxJSON = {
			name,
			arrayType,
			data: Array.from(data.slice(0, Math.min(3, data.length))),
			data_length: `${data.length} items`,
			indexedVal,
			uniques: uniques.slice(0, Math.min(3, uniques.length)),
			total_uniques: `${uniques.length} items`,
			colorIndices,
			min,
			max,
		};
		retArr.toJSON = () => { return reduxJSON; };
	}
	return retArr;
}


/**
 * - `array`: array to be sorted
 * - `comparator`: comparison closure that takes *indices* i and j,
 *   and compares `array[i]` to `array[j]`. To ensure stability, it
 *   should always end with `i - j` as the last comparison .
 *
 * Example:
 * ```
 *  let array = [{n: 1, s: "b"}, {n: 1, s: "a"}, {n:0, s: "a"}];
 *  let comparator = (i, j) => {
 *    let vi = array[i].n, vj = array[j].n;
 *    return vi < vj ? -1 :
 *      vi > vj ? 1 :
 *        i - j;
 *  };
 *  stableSortInPlace(array, comparator);
 *  // ==> [{n:0, s: "a"}, {n:1, s: "b"}, {n:1, s: "a"}]
 * ```
 */

export function stableSortInPlace(array, comparator) {
	return sortFromIndices(array, findIndices(array, comparator));
}

export function stableSortedCopy(array, comparator) {
	let indices = findIndices(array, comparator);
	let i = array.length;
	let sortedArray = new Array(i);
	while (i--) {
		sortedArray[i] = array[indices[i]];
	}
	return sortedArray;
}

/**
 * Finds the index of the value that *should* be stored
 * at each array position (that is: `array[i]` should have
 * the value at `array[indices[i]]`)
 *
 * - `array`: array to find indices for.
 * - `comparator`: comparison closure that takes *index* i and j,
 *   and compares values at `array[i]` to `array[j]` in some way.
 *   To force stability, end comparison chain with with `i - j`.
 *
 * Example:
 * ```
 *  let array = [{n: 1, s: "b"}, {n: 1, s: "a"}, {n:0, s: "a"}];
 *  let comparator = (i, j) => {
 *    let vi = array[i].n, vj = array[j].n;
 *    return vi < vj ? -1 :
 *      vi > vj ? 1 :
 *        i - j;
 *  };
 *  findIndices(array, comparator);
 *  // ==> [2, 0, 1]
 * ```
 */
export function findIndices(array, comparator) {
	// Assumes we don't have to worry about sorting more than
	// 4 billion elements; replace it with a smaller typed array
	// for smaller input sizes.
	const arrayType = array.length < 256 ? 'uint8' : array.length < 65535 ? 'uint16' : 'uint32';
	let indices = new (arrayConstr(arrayType))(array.length), i = array.length;
	// unrolled 16-decrement loop was benchmarked as the fastest
	while (i - 16 > 0) {
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
		indices[--i] = i;
	}
	while (i--) {
		indices[i] = i;
	}
	// after sorting, `indices[i]` gives the index from where
	// `array[i]` should take the value from, so
	// `array[i]` should have the value at `array[indices[i]]`
	return indices.sort(comparator);
}

/**
 * Effectively: `sorted array[i] = array[indices[i]]`
 *
 * `indices` must contain each index of `array`, and each
 * index must be present only once! In other words:
 * indices must contain all integers in the range
 * `[0, array.length-1]`.
 *
 * This function does *not* check for valid input!
 *
 * Example:
 * - in: `['a', 'b', 'c', 'd', 'e' ]`, `[1, 2, 0, 4, 3]`,
 * - out: `['b', 'c', 'a', 'e', 'd' ]`, `[0, 1, 2, 3, 4]`
 * @param {[]} array - data to be sorted in-place
 * @param {number[]} indices - indices from where the value
 * should *come from*
 */
export function sortFromIndices(array, indices) {
	// there might be multiple cycles, so we must
	// walk through the whole array to check
	let k = array.length;
	while (k--) {
		// advance until we find a value in
		// the "wrong" position
		if (k !== indices[k]) {
			// create vacancy to use "half-swaps" trick
			// Thank you Andrei Alexandrescu
			let v0 = array[k];
			let i = k;
			let j = indices[k];
			while (j !== k) {
				// shuffle value around
				array[i] = array[j];
				// array[i] is now in the correct position,
				// update indices[i] to reflect this
				indices[i] = i;
				// go to next index
				i = j;
				j = indices[j];
			}
			// put original array[k] back in
			// the array and update indices
			array[i] = v0;
			indices[i] = i;
		}
	}
	return array;
}

export function arraySubset(data, arrayType, indices) {
	let selection = new (arrayConstr(arrayType))(indices.length),
		i = indices.length;
	while (i--) {
		selection[i] = data[indices[i]];
	}
	return selection;
}

export function arrayConstr(arrayType) {
	switch (arrayType) {
		case 'float32':
			return Float32Array;
		case 'number':
		case 'float64':
			return Float64Array;
		case 'integer':
		case 'int32':
			return Int32Array;
		case 'int16':
			return Int16Array;
		case 'int8':
			return Int8Array;
		case 'uint32':
			return Uint32Array;
		case 'uint16':
			return Uint16Array;
		case 'uint8':
			return Uint8Array;
		default:
	}
	return Array;
}

// checks if an object is an array or typed array
// not for our objects that encapsulate typed arrays
export function isArray(obj) {
	return obj instanceof Array || isTypedArray(obj);
}

export function isTypedArray(obj) {
	return obj instanceof Uint8Array ||
		obj instanceof Float32Array ||
		obj instanceof Uint16Array ||
		obj instanceof Uint32Array ||
		obj instanceof Int32Array ||
		obj instanceof Float64Array ||
		obj instanceof Int8Array ||
		obj instanceof Uint8ClampedArray ||
		obj instanceof Int16Array;
}

// === Helper functions for updating Redux state ===
//
// Assumptions: these functions are for merging states
// in Redux, which is usually overwriting part of the
// old state with a new state.
// Most of the time the new state will have overlapping
// keys, and the number of keys will be relatively small.
// In other words: for two trees with N total and M over-
// lapping keys, M will be very small most of the time.
// Note that when not overlapping, merge just shallow
// copies the old/new values and does not go through the
// whole tree. We can safely do this because values in
// the Redux store are supposed to be immutable. So while
// worst case behaviour is somewhere around O(N²), which
// is when all keys overlap, in practice this is unlikely
// to happen.
//

/**
 * Takes arrays `a` and `b`.
 * Returns an array containing overlapping values, and
 * mutates `a` and `b` such that they only contain their
 * non-overlapping values. If there are any overlapping
 * values, `a` and `b` might change order. If either
 * array contains duplicates, this function will only
 * only find the number of matching duplicates
 * Example:
 * - in: a = `[1, 2, 2, 3]`, b = `[2, 3, 4, 5, 6]`
 * - out: `[2, 3]`; a = `[1, 2]`, b = `[5, 6, 4]`
 * @param {x[]} a - will be mutated
 * @param {x[]} b - will be mutated
 * @returns {x[]} overlap - overlapping values
 */
export function disjointArrays(a, b) {
	// Having the larger array in the inner loop should
	// be a little bit faster (less loop initialisations)
	if (b.length < a.length) {
		let t = a;
		a = b;
		b = t;
	}
	let overlap = [], i = a.length;
	while (i--) {
		let aval = a[i];
		let j = b.length;
		while (j--) {
			let bval = b[j];
			if (aval === bval) {
				overlap.push(aval);
				a[i] = a[a.length - 1]; a.pop();
				b[j] = b[b.length - 1]; b.pop();
				break;
			}
		}
	}
	return overlap;
}

/**
 * Returns a new object that merges the values of
 * `newObj` into `oldObj`. Uses shallow copying.
 *
 * **IMPORTANT:** util.merge does **NOT** behave like
 * lodash merge!
 *
 * - for duplicate keys, values that are objects
 * (but not (typed) arrays) are recursively merged.
 * - in all other cases, the value from `newObj` is
 * assigned to the resulting object.
 *
 * **TL;DR:** (typed) arrays are not merged but replaced
 * by the newer array!
 * @param {object} oldObj
 * @param {object} newObj
 */
export function merge(oldObj, newObj) {
	if (!oldObj) {
		return Object.assign({}, newObj);
	} else if (!newObj) {
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	let overlappingKeys = disjointArrays(untouchedKeys, newKeys);

	let mergedObj = {}, key = '', i = overlappingKeys.length;
	while (i--) {
		key = overlappingKeys[i];
		let newVal = newObj[key];
		// merge object values by recursion, otherwise just assign new value
		mergedObj[key] = (typeof newVal === 'object' && !isArray(newVal)) ?
			merge(oldObj[key], newVal) : newVal;
	}
	// directly assign all values that don't need merging
	i = untouchedKeys.length;
	while (i--) {
		key = untouchedKeys[i];
		mergedObj[key] = oldObj[key];
	}
	i = newKeys.length;
	while (i--) {
		key = newKeys[i];
		mergedObj[key] = newObj[key];
	}
	return mergedObj;
}

/**
 * Like `merge`, but overwrites `oldObj` instead of creating
 * a new one.
 * @param {object} oldObj - original object to be merged into
 * @param {object} newObj - new object to merge into oldObj
 */
export function mergeInplace(oldObj, newObj) {
	if (!oldObj) {
		return Object.assign({}, newObj);
	} else if (!newObj) {
		return oldObj;
	}
	let untouchedKeys = Object.keys(oldObj);
	let newKeys = Object.keys(newObj);
	let overlappingKeys = disjointArrays(untouchedKeys, newKeys);

	let key = '', i = overlappingKeys.length;
	while (i--) {
		key = overlappingKeys[i];
		let newVal = newObj[key];
		// merge object values by recursion, otherwise just assign new value
		oldObj[key] = (typeof newVal === 'object' && !isArray(newVal)) ?
			mergeInplace(oldObj[key], newVal) : newVal;
	}
	i = newKeys.length;
	while (i--) {
		key = newKeys[i];
		oldObj[key] = newObj[key];
	}
	return oldObj;
}

/*
// cycle detector
function isCyclic(obj) {
	var keys = [];
	var stack = [];
	var stackSet = new Set();
	var detected = false;

	function detect(obj, key) {
		if (typeof obj != 'object') { return; }

		if (stackSet.has(obj)) { // it's cyclic! Print the object and its locations.
			var oldindex = stack.indexOf(obj);
			var l1 = keys.join('.') + '.' + key;
			var l2 = keys.slice(0, oldindex + 1).join('.');
			console.log('CIRCULAR: ' + l1 + ' = ' + l2 + ' = ' + obj);
			console.log({obj});
			detected = true;
			return;
		}

		keys.push(key);
		stack.push(obj);
		stackSet.add(obj);
		for (var k in obj) { //dive on the object's children
			if (obj.hasOwnProperty(k)) { detect(obj[k], k); }
		}

		keys.pop();
		stack.pop();
		stackSet.delete(obj);
		return;
	}

	detect(obj, 'obj');
	return detected;
}
*/
