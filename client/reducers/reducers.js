// See http://rackt.org/redux/docs/basics/Reducers.html
import { combineReducers } from 'redux';

import {
	REQUEST_PROJECTS,
	REQUEST_PROJECTS_FAILED,
	RECEIVE_PROJECTS,
	REQUEST_DATASET,
	REQUEST_DATASET_FAILED,
	RECEIVE_DATASET,
	REQUEST_GENE,
	REQUEST_GENE_FAILED,
	RECEIVE_GENE,
	SET_HEATMAP_PROPS,
	SET_GENESCAPE_PROPS,
	SET_LANDSCAPE_PROPS,
	SET_SPARKLINE_PROPS,
} from '../actions/actionTypes';

import { merge } from '../js/util';

// pattern used for merging various view states
// and fetchedGenes with their respective datasets
function mergeDataSetState(state, action, ...stateNames) {
	const prevDataSet = state.dataSets[action.datasetName];
	const newDataSets = stateNames.map((name) => {
		const newState = merge(prevDataSet[name], action[name]);
		return { [name]: newState };
	});
	const dataSet = merge(prevDataSet, ...newDataSets);
	const dataSets = merge(state.dataSets, { [action.datasetName]: dataSet });
	return merge(state, { dataSets });
}

// used for writing view state to the browser URL
import { browserHistory } from 'react-router';
import JSURL from 'jsurl';

function setViewStateURL(state, action, stateName){
	let view = '';
	switch(stateName){
	case 'heatmapState':
		view = 'heatmap';
		break;
	case 'sparklineState':
		view = 'sparklines';
		break;
	case 'landscapeState':
		view = 'cells';
		break;
	case 'genescapeState':
		view = 'genes';
		break;
	}
	const datasetName = action.datasetName;
	const dataSet = state.dataSets[datasetName];
	const project = dataSet.project;
	const viewState = merge(dataSet[stateName], action[stateName]);
	const viewSettings = JSURL.stringify(viewState);
	browserHistory.replace(`/dataset/${view}/${project}/${datasetName}/${viewSettings}`);
}

// Keeps track of projects and datasets, including managing asynchronous fetching
const initialData = {
	isFetchingData: false,
	errorFetchingData: false,

	//	{
	//		'Midbrain': [{ 'dataset': 'mouse_midbrain.loom', 'isCached': false}, ... ],
	// 	'Cortex': ...
	//	}
	projects: undefined,

	// dataSets object will store fetched datasets & genes for caching purposes.
	dataSets: {},
};

function data(state = initialData, action) {
	switch (action.type) {
		//===PROJECT ACTIONS===
	case REQUEST_PROJECTS:
		return merge(state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_PROJECTS:
		return merge(state, {
			isFetchingData: false,
			projects: action.projects,
		});

	case REQUEST_PROJECTS_FAILED:
		return merge(state, { isFetchingData: false, errorFetchingData: true });

		//===DATASET ACTIONS===
	case REQUEST_DATASET:
		return merge(state, { isFetchingData: true, errorFetchingData: false });

	case RECEIVE_DATASET:
		// initialise empty fetchedGenes cache
		const dataSet = merge(action.dataSet, { fetchedGenes: {}, fetchingGenes: {} });
		return merge(state, {
			isFetchingData: false,
			hasDataset: true,
			dataSets: merge(state.dataSets, { [dataSet.dataset]: dataSet }),
		});

	case REQUEST_DATASET_FAILED:
		return merge(state, { isFetchingData: false, errorFetchingData: true });

		//===GENE ACTIONS===
	case REQUEST_GENE:
		//return merge(state, { isFetchingData: true, errorFetchingData: false });
		return mergeDataSetState(state, action, 'fetchingGenes');

	case RECEIVE_GENE:
		return mergeDataSetState(state, action, 'fetchingGenes', 'fetchedGenes');

	case REQUEST_GENE_FAILED:
		//return merge(state, { isFetchingData: false, errorFetchingData: true });
		return mergeDataSetState(state, action, 'fetchingGenes');

		//===VIEW ACTIONS===

	case SET_HEATMAP_PROPS:
		setViewStateURL(state, action, 'heatmapState');
		return mergeDataSetState(state, action, 'heatmapState');

	case SET_SPARKLINE_PROPS:
		setViewStateURL(state, action, 'sparklineState');
		return mergeDataSetState(state, action, 'sparklineState');

	case SET_LANDSCAPE_PROPS:
		setViewStateURL(state, action, 'landscapeState');
		return mergeDataSetState(state, action, 'landscapeState');

	case SET_GENESCAPE_PROPS:
		setViewStateURL(state, action, 'genescapeState');
		return mergeDataSetState(state, action, 'genescapeState');

	default:
		return state;
	}
}

const loomAppReducer = combineReducers({ data });
export default loomAppReducer;