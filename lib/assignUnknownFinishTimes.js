function findPreviousKnownTime(finishers, startIndex) {
  const previousFinisher = finishers
    .slice(0, startIndex)
    .reverse()
    .find((f) => f.timeStr && f.timeSec > 0);
  return previousFinisher ? previousFinisher.timeSec : null;
}

function findNextKnownTime(finishers, startIndex) {
  const nextFinisher = finishers.slice(startIndex + 1).find((f) => f.timeStr && f.timeSec > 0);
  return nextFinisher ? nextFinisher.timeSec : null;
}

function assignUnknownFinishTimes(finishers) {
  return finishers.map((finisher, index) => {
    if (finisher.timeStr && finisher.timeSec > 0) {
      return finisher;
    }

    const prevTime = findPreviousKnownTime(finishers, index);
    const nextTime = findNextKnownTime(finishers, index);
    const estimatedTime = prevTime || nextTime || 0;

    return {
      ...finisher,
      timeSec: estimatedTime,
      estimatedTime: estimatedTime > 0,
    };
  });
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { assignUnknownFinishTimes, findPreviousKnownTime, findNextKnownTime };
}
