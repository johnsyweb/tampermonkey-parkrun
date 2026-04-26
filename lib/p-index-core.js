function parseDateDdMmYyyy(dateStr) {
  const [day, month, year] = dateStr.split('/').map((value) => parseInt(value, 10));
  return new Date(year, month - 1, day);
}

function groupFinishesByEvent(finishTimeline) {
  const grouped = finishTimeline.reduce((acc, { eventName, date, eventNumber }) => {
    if (!acc[eventName]) {
      acc[eventName] = [];
    }
    acc[eventName].push({ date, eventNumber });
    return acc;
  }, {});

  return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
}

function calculatePIndex(groupedEvents) {
  const filteredGroupedEvents = groupedEvents.filter(([, events], index) => events.length > index);
  return filteredGroupedEvents.length;
}

function buildEventStats(finishes) {
  const statsMap = new Map();
  finishes.forEach((finish, index) => {
    const existing = statsMap.get(finish.eventName) || { count: 0, lastVisitIndex: -1 };
    statsMap.set(finish.eventName, {
      count: existing.count + 1,
      lastVisitIndex: index,
    });
  });

  return Array.from(statsMap.entries()).map(([eventName, stats]) => ({
    eventName,
    count: stats.count,
    lastVisitIndex: stats.lastVisitIndex,
  }));
}

function calculateMinimumFinishesPlan(eventCounts, targetPIndex) {
  const scoredEvents = eventCounts
    .map((event) => ({
      eventName: event.eventName,
      count: event.count,
      lastVisitIndex:
        typeof event.lastVisitIndex === 'number' ? event.lastVisitIndex : Number.NEGATIVE_INFINITY,
      score: Math.min(event.count, targetPIndex),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.count !== a.count) return b.count - a.count;
      if (b.lastVisitIndex !== a.lastVisitIndex) return b.lastVisitIndex - a.lastVisitIndex;
      return a.eventName.localeCompare(b.eventName);
    });

  const selectedExisting = scoredEvents.slice(0, targetPIndex);
  const actions = [];
  let totalAdditionalFinishes = 0;
  const usedEventNames = new Set(eventCounts.map((event) => event.eventName));

  selectedExisting
    .filter((event) => event.count < targetPIndex)
    .sort((a, b) => {
      if (a.lastVisitIndex !== b.lastVisitIndex) return a.lastVisitIndex - b.lastVisitIndex;
      return a.eventName.localeCompare(b.eventName);
    })
    .forEach((event) => {
      const additionalFinishes = Math.max(0, targetPIndex - event.count);
      actions.push({
        eventName: event.eventName,
        additionalFinishes,
        isNewEvent: false,
      });
      totalAdditionalFinishes += additionalFinishes;
    });

  const missingEvents = Math.max(0, targetPIndex - selectedExisting.length);
  let newEventIndex = 1;
  for (let i = 0; i < missingEvents; i++) {
    while (usedEventNames.has(`New event ${newEventIndex}`)) {
      newEventIndex++;
    }
    const eventName = `New event ${newEventIndex}`;
    usedEventNames.add(eventName);
    actions.push({
      eventName,
      additionalFinishes: targetPIndex,
      isNewEvent: true,
    });
    totalAdditionalFinishes += targetPIndex;
    newEventIndex++;
  }

  return {
    targetPIndex,
    totalAdditionalFinishes,
    actions,
  };
}

function applyPlanToEventCounts(eventCounts, actions) {
  const countsMap = new Map(
    eventCounts.map((event) => [
      event.eventName,
      {
        count: event.count,
        lastVisitIndex:
          typeof event.lastVisitIndex === 'number'
            ? event.lastVisitIndex
            : Number.NEGATIVE_INFINITY,
      },
    ])
  );
  const nextVisitIndex =
    eventCounts.reduce(
      (max, event) =>
        typeof event.lastVisitIndex === 'number' ? Math.max(max, event.lastVisitIndex) : max,
      Number.NEGATIVE_INFINITY
    ) + 1;
  let runningVisitIndex = Number.isFinite(nextVisitIndex) ? nextVisitIndex : 0;

  actions.forEach((action) => {
    const existing = countsMap.get(action.eventName) || {
      count: 0,
      lastVisitIndex: Number.NEGATIVE_INFINITY,
    };
    countsMap.set(action.eventName, {
      count: existing.count + action.additionalFinishes,
      lastVisitIndex: runningVisitIndex + action.additionalFinishes - 1,
    });
    runningVisitIndex += action.additionalFinishes;
  });

  return Array.from(countsMap.entries()).map(([eventName, data]) => ({
    eventName,
    count: data.count,
    lastVisitIndex: data.lastVisitIndex,
  }));
}

function calculatePIndexProgression(finishTimeline) {
  const progression = [];
  let previousPIndex = 0;
  let previousIncreaseFinish = 0;

  for (let i = 0; i < finishTimeline.length; i++) {
    const finishesToDate = finishTimeline.slice(0, i + 1);
    const eventStats = buildEventStats(finishesToDate);
    const grouped = groupFinishesByEvent(finishesToDate);
    const currentPIndex = calculatePIndex(grouped);
    const nextPlan = calculateMinimumFinishesPlan(eventStats, currentPIndex + 1);
    const projectedCounts = applyPlanToEventCounts(eventStats, nextPlan.actions);
    const lookaheadPlan = calculateMinimumFinishesPlan(projectedCounts, currentPIndex + 2);
    const finish = finishTimeline[i];
    const finishes = i + 1;
    const isJump = currentPIndex > previousPIndex;
    const finishesSincePreviousIncrease = finishes - previousIncreaseFinish;

    progression.push({
      finishes,
      date: finish.date,
      eventName: finish.eventName,
      eventNumber: finish.eventNumber,
      pIndex: currentPIndex,
      previousPIndex,
      isJump,
      finishesSincePreviousIncrease,
      nextPlan,
      lookaheadPlan,
    });

    if (isJump) {
      previousIncreaseFinish = finishes;
      previousPIndex = currentPIndex;
    }
  }

  return progression;
}

function buildDifficultyMetrics(progression, pIndex) {
  if (progression.length === 0) {
    return {
      latestGap: 0,
      longestGap: 0,
      startLevel: 0,
      endLevel: 0,
      nextTarget: 1,
      nextPlan: {
        targetPIndex: 1,
        totalAdditionalFinishes: 1,
        actions: [{ eventName: 'New event 1', additionalFinishes: 1, isNewEvent: true }],
      },
      lookaheadTarget: 2,
      lookaheadPlan: {
        targetPIndex: 2,
        totalAdditionalFinishes: 3,
        actions: [
          { eventName: 'New event 2', additionalFinishes: 2, isNewEvent: true },
          { eventName: 'New event 3', additionalFinishes: 1, isNewEvent: true },
        ],
      },
    };
  }

  const jumpPoints = progression.filter((point) => point.isJump);
  const latest = progression[progression.length - 1];
  const hardestJump = jumpPoints.reduce((hardest, point) => {
    if (!hardest || point.finishesSincePreviousIncrease > hardest.finishesSincePreviousIncrease) {
      return point;
    }
    return hardest;
  }, null);

  return {
    latestGap: latest.finishesSincePreviousIncrease,
    longestGap: hardestJump ? hardestJump.finishesSincePreviousIncrease : 0,
    startLevel: hardestJump ? hardestJump.previousPIndex : 0,
    endLevel: hardestJump ? hardestJump.pIndex : 0,
    nextTarget: pIndex + 1,
    nextPlan: latest.nextPlan,
    lookaheadTarget: pIndex + 2,
    lookaheadPlan: latest.lookaheadPlan,
  };
}

module.exports = {
  applyPlanToEventCounts,
  buildDifficultyMetrics,
  buildEventStats,
  calculateMinimumFinishesPlan,
  calculatePIndex,
  calculatePIndexProgression,
  groupFinishesByEvent,
  parseDateDdMmYyyy,
};
