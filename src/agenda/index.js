import React, {Component} from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Animated
} from 'react-native';
import XDate from 'xdate';

import {parseDate, xdateToData} from '../interface';
import dateutils from '../dateutils';
import CalendarList from '../calendar-list';
import ReservationsList from './reservation-list';
import styleConstructor from './style';

const CALENDAR_OFFSET = 38;

const SCREEN_HEIGHT_OFFSET = 2 / 3;

export default class AgendaView extends Component {

  constructor(props) {
    super(props);
    this.styles = styleConstructor(props.theme);
    this.screenHeight = Dimensions.get('window').height;
    this.scrollTimeout = undefined;
    this.state = {
      openAnimation: new Animated.Value(0),
      calendarScrollable: false,
      firstReservationLoad: false,
      selectedDay: parseDate(this.props.selected) || XDate(true),
      topDay: parseDate(this.props.selected) || XDate(true),
    };
    this.currentMonth = this.state.selectedDay.clone();
    this.expandCalendar = this.expandCalendar.bind(this);

    this.checked = false;
  }

  onLayout(event) {
    this.screenHeight = event.nativeEvent.layout.height;
    this.calendar.scrollToDay(this.state.selectedDay.clone(), CALENDAR_OFFSET, false);
  }

  onVisibleMonthsChange(months) {
    if (this.props.items && !this.state.firstReservationLoad) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        if (this.props.loadItemsForMonth && this._isMounted) {
          this.props.loadItemsForMonth(months[0]);
        }
      }, 200);
    }
  }

  loadReservations(props) {
    if ((!props.items || !Object.keys(props.items).length) && !this.state.firstReservationLoad) {
      this.setState({
        firstReservationLoad: true
      }, () => {
        this.props.loadItemsForMonth(xdateToData(this.state.selectedDay));
      });
    }
  }

  componentWillMount() {
    this._isMounted = true;
    this.loadReservations(this.props);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentWillReceiveProps(props) {
    if (props.items) {
      this.setState({
        firstReservationLoad: false
      });
    } else {
      this.loadReservations(props);
    }
  }

  get scrollUp() {
    Animated.timing(this.state.openAnimation, {
      toValue: 1,
      duration: 300
    }).start();
    this.calendar.scrollToDay(this.state.selectedDay, 100 - ((this.screenHeight / 2) - 16), true);
  }

  get scrollDown() {
    const choosedDay = this.state.topDay;
    this.setState({
      calendarScrollable: false,
    });
    Animated.timing(this.state.openAnimation, {
      toValue: 0,
      duration: 200
    }).start();
    this.calendar.scrollToDay(choosedDay, CALENDAR_OFFSET, true);
    this.props.loadItemsForMonth(choosedDay);
    if (this.props.onDayPress) {
      this.props.onDayPress(choosedDay);
    }
  }

  expandCalendar() {
    this.checked = !this.checked;
    this.setState({
      calendarScrollable: true
    });

    !this.checked ? this.scrollDown : this.scrollUp;
  }

  chooseDay(d) {
    const day = parseDate(d);
    this.setState({
      calendarScrollable: false,
      selectedDay: day.clone()
    });
    if (this.state.calendarScrollable) {
      this.setState({
        topDay: day.clone()
      });
    }
    Animated.timing(this.state.openAnimation, {
      toValue: 0,
      duration: 200,
    }).start();
    this.calendar.scrollToDay(day, CALENDAR_OFFSET, true);
    this.props.loadItemsForMonth(d);
    if (this.props.onDayPress) {
      this.props.onDayPress(d);
    }
  }

  renderReservations() {
    return (
      <ReservationsList
        renderTime={this.props.renderTime}
        renderEmptyItemsView={this.props.renderEmptyItemsView}
        rowHasChanged={this.props.rowHasChanged}
        renderItem={this.props.renderItem}
        renderDay={this.props.renderDay}
        renderEmptyDate={this.props.renderEmptyDate}
        reservations={this.props.items}
        selectedDay={this.state.selectedDay}
        topDay={this.state.topDay}
        onDayChange={this.onDayChange.bind(this)}
        onScroll={() => {}}
        ref={(c) => this.list = c}
      />
    );
  }

  onDayChange(day) {
    const newDate = parseDate(day);
    const withAnimation = dateutils.sameMonth(newDate, this.state.selectedDay);
    this.calendar.scrollToDay(day, CALENDAR_OFFSET, withAnimation);
    this.setState({
      selectedDay: parseDate(day)
    });
  }

  render() {
    const weekDaysNames = XDate.locales[XDate.defaultLocale].dayNamesShort;
    const maxCalHeight = this.screenHeight * SCREEN_HEIGHT_OFFSET;
    const calendarStyle = [this.styles.calendar, {height: this.state.openAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [104, maxCalHeight]
    })}];
    const weekdaysStyle = [this.styles.weekdays, {opacity: this.state.openAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0]
    })}];

    let knob = (<View style={this.styles.knobContainer}/>);

    if (!this.props.hideKnob) {
      knob = (
        <View style={this.styles.knobContainer}>
          <TouchableOpacity onPress={this.expandCalendar}>
            <View style={this.styles.knob}/>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View onLayout={this.onLayout.bind(this)} style={[this.props.style, {flex: 1}]}>
        <View style={this.styles.reservations}>
          {this.renderReservations()}
        </View>
        <Animated.View style={calendarStyle}>
          <CalendarList
            theme={this.props.theme}
            pastScrollRange={0}
            futureScrollRange={2}
            onVisibleMonthsChange={this.onVisibleMonthsChange.bind(this)}
            ref={(c) => this.calendar = c}
            selected={[this.state.selectedDay]}
            current={this.currentMonth}
            markedDates={this.props.items}
            onDayPress={this.chooseDay.bind(this)}
            scrollingEnabled={this.state.calendarScrollable}
            hideExtraDays={this.state.calendarScrollable}
          />
          {knob}
        </Animated.View>
        <Animated.View style={weekdaysStyle}
                        use>
          {weekDaysNames.map((day) => (
            <Text key={day} style={this.styles.weekday}>{day}</Text>
          ))}
        </Animated.View>
      </View>
    );
  }
}
