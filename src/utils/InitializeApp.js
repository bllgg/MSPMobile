import { createStore, applyMiddleware, compose } from 'redux';
import { AsyncStorage } from 'react-native';
import { persistStore, autoRehydrate } from 'redux-persist';
import ReduxThunk from 'redux-thunk';
import _ from 'lodash';
import OneSignal from 'react-native-onesignal';
import reducers from '../reducers';
import { REDUX_OFFLINE_STORE } from './AsyncKeys';
import { NOTIFICATION_RECEIVED, NOTIFICATIONS_RECEIVED } from '../actions/types';

let store = null;
const buffer = [];

export const onReceived = (notification) => {
    console.log("Notification received: ", notification);
}

export const onOpened = (openResult) => {
    console.log('openResult: ', openResult);
    if (openResult.notification.groupedNotifications) {
        // stacked notifications
        buffer = buffer.concat(openResult.notification.groupedNotifications);
    } else {
        // single notification
        buffer.push(openResult.notification.payload);
    }
}

export const onRegistered = (notifData) => {
    console.log("Device had been registered for push notifications!", notifData);
}

export const onIds = (device) => {
    console.log('Device info: ', device);
}

// creates the store
export const InitializeApp = () => {
    /* ------------- Redux Configuration ------------- */

    const middleware = [];
    const enhancers = [];

    /* ------------- ReduxThunk Middleware ------------- */
    middleware.push(ReduxThunk);

    /* ------------- Redux Logger Middleware ------------- */
    // Note: logger must be the last middleware in chain,
    // otherwise it will log thunk and promise, not actual actions.

    if (process.env.NODE_ENV === 'development') {
        const { createLogger } = require('redux-logger');

        const logger = createLogger(
            {
                collapsed: true,
                duration: true,
                diff: true
            });
        middleware.push(logger);
    }

    /* ------------- Assemble Middleware ------------- */
    const middlewareEnhancer = applyMiddleware(...middleware);
    enhancers.push(middlewareEnhancer);

    /* ------------- AutoRehydrate Enhancer ------------- */
    // add the autoRehydrate enhancer
    enhancers.push(autoRehydrate());

    store = createStore(reducers, {}, compose(...enhancers));





    persistStore(store, {
        storage: AsyncStorage,
        keyPrefix: REDUX_OFFLINE_STORE,
        debounce: 1000, // default is 1000 ms
        blacklist: [] // these reducers contain temory ap states for UI, so don't to persist them.
    },
        () => {
            console.log('Rehydration completed!');
            console.log('notification buffer ', buffer);
            buffer.forEach((item) => {
                // Filter out notifications
                const notification = {
                    notificationID: item.notificationID,
                    body: item.body,
                    title: item.title,
                    sentTime: JSON.parse(item.rawPayload)['google.sent_time']
                }
                store.dispatch({ type: NOTIFICATION_RECEIVED, payload: notification });
            });

        }
    );

    return store;
};

