import _ from "lodash";
import React from "react";
import { customWords } from "../../Tools/DefinitionGenerator/customWords";

interface Duration {
    years: number;
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}
export default class Helpers {
    // checks if an object is {}
    static isEmptyObject(object: any) {
        if (!object) {
            return true;
        }
        return Object.keys(object).length === 0;
    }

    static convertToCamel(name: string): string {
        name = name.replace("MediaGraph", "");
        name = name.charAt(0).toLowerCase() + name.slice(1);
        return name;
    }

    static camelToSentenceCase(text: string, removeMediaGraph: boolean): string {
        if (removeMediaGraph) {
            text = text.replace("MediaGraph", "");
        }
        const sentenceCaseRegex = `(${customWords.join("|")}|[A-Z])`;
        text = text.replace(new RegExp(sentenceCaseRegex, "g"), " $1").trim();
        text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        customWords.forEach((word) => {
            text = text.replace(new RegExp(word, "ig"), word);
        });
        return text;
    }

    static secondsToIso = (value: any) => {
        if (value == "") {
            return "";
        }
        return _.isNaN(_.toNumber(value)) ? null : `PT0H0M${value}S`;
    };

    static isoToSeconds(isoString: any) {
        const duration = Helpers.parseXmlDuration(isoString);
        if (duration == null) {
            return null;
        }
        return duration.days * 24 * 60 * 60 + duration.hours * 60 * 60 + duration.minutes * 60 + duration.seconds;
    }

    static parseXmlDuration(duration: any): Duration | null {
        const regex = /P((([0-9]*\.?[0-9]*)Y)?(([0-9]*\.?[0-9]*)M)?(([0-9]*\.?[0-9]*)W)?(([0-9]*\.?[0-9]*)D)?)?(T(([0-9]*\.?[0-9]*)H)?(([0-9]*\.?[0-9]*)M)?(([0-9]*\.?[0-9]*)S)?)?/;
        const matches: any[] = duration.match(regex);
        if (matches == undefined) {
            return null;
        }
        return {
            years: matches[3] ? parseFloat(matches[3]) : 0,
            months: matches[5] ? parseFloat(matches[5]) : 0,
            weeks: matches[7] ? parseFloat(matches[7]) : 0,
            days: matches[9] ? parseFloat(matches[9]) : 0,
            hours: matches[12] ? parseFloat(matches[12]) : 0,
            minutes: matches[14] ? parseFloat(matches[14]) : 0,
            seconds: matches[16] ? parseFloat(matches[16]) : 0
        };
    }

    static removeEmptyObjects(obj: any): any {
        if(_.isArray(obj)) {
          return _(obj)
            .filter(_.isObject)
          .map(Helpers.removeEmptyObjects)
          .reject(_.isEmpty)
          .concat(_.reject(obj, _.isObject))
          .value();
        }

      return _(obj)
        .pickBy(_.isObject)
        .mapValues(Helpers.removeEmptyObjects)
        .omitBy(_.isEmpty)
        .assign(_.omitBy(obj, _.isObject))
        .value();
    }
}
