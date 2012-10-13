describe('flight status service', function () {
  var url = require('url');
  var https = require('https');
  var _ = require('../public/js/lib/underscore.min');
  var fsService = require('../flight_status_service');
  var config = require('../config');
  var tool = require('../tool');
  var opts;

  beforeEach(function () {
    opts = {
      iata: 'JFK',
      type: 'dep',
      time: Date.UTC(2012, 9 - 1, 1, 10, 30, 15), // 2012-09-01 10:30:15 UTC
      numberOfHours: 5,
      numberOfRequests: 3,
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error')
    };
  });

  describe('.requestUrl', function () {
    it('should return url for a flights status request', function () {
      var parsedUrl = url.parse(fsService.requestUrl(opts), true);

      expect(parsedUrl.protocol).toBe('https:');
      expect(parsedUrl.host).toBe('api.flightstats.com');
      expect(parsedUrl.pathname).toBe('/flex/flightstatus/rest/v2/json/airport/status/JFK/dep/2012/9/1/10');
      expect(config.flightstats.appId).toEqual(jasmine.any(String));
      expect(config.flightstats.appKey).toEqual(jasmine.any(String));
      expect(parsedUrl.query).toEqual({
        codeType: 'IATA',
        utc: 'true',
        numHours: '5',
        appId: config.flightstats.appId,
        appKey: config.flightstats.appKey
      });
    });
  });

  describe('.get', function () {
    var clientRequest;

    beforeEach(function () {
      clientRequest = jasmine.createSpyObj('ClientRequest', ['on', 'setTimeout']);
      clientRequest.on.andReturn(clientRequest);
    });

    describe('send a request', function () {
      beforeEach(function () {
        spyOn(https, 'get').andReturn(clientRequest);
        fsService.get(opts);
      });

      it('should send a request to flights status api', function () {
        expect(https.get).toHaveBeenCalledWith(fsService.requestUrl(opts), jasmine.any(Function));
      });

      it('should set on error handler', function () {
        expect(clientRequest.on).toHaveBeenCalledWith('error', opts.error);
      });

      it('should set timeout', function () {
        expect(config.httpTimeout).toEqual(jasmine.any(Number));
        expect(clientRequest.setTimeout).toHaveBeenCalledWith(config.httpTimeout);
      });
    });

    it('should call an error callback when status code !== 200', function () {
      var response = {statusCode: 500};
      spyOn(https, 'get').andCallFake(function (url, callback) {
        callback(response);

        return clientRequest;
      });

      fsService.get(opts);

      expect(opts.error).toHaveBeenCalledWith(jasmine.any(String), response);
    });

    it('should call a success callback', function () {
      spyOn(https, 'get').andCallFake(function (url, callback) {
        var response = {
          statusCode: 200,
          callbacks: {},

          on: function(event, callback) {
            this.callbacks[event] = callback;
          }
        };

        callback(response);
        response.callbacks.data('data fr');
        response.callbacks.data('om server');
        response.callbacks.end();

        return clientRequest;
      });

      fsService.get(opts);

      expect(opts.success).toHaveBeenCalledWith('data from server');
    });
  });

  describe('.multiGet', function () {
    it('should call .get method numberOfRequests times with time offset', function () {
      var times = [
        opts.time,
        opts.time + opts.numberOfHours * tool.hour(),
        opts.time + opts.numberOfHours * 2 * tool.hour()
      ];
      spyOn(fsService, 'get');

      fsService.multiGet(opts);

      expect(fsService.get.callCount).toEqual(3);
      expect(fsService.get).toHaveBeenCalledWith(_.extend(_.clone(opts), {time: times[0]}));
      expect(fsService.get).toHaveBeenCalledWith(_.extend(_.clone(opts), {time: times[1]}));
      expect(fsService.get).toHaveBeenCalledWith(_.extend(_.clone(opts), {time: times[2]}));
    });
  });

  describe('.getStartTimeForMultiGet', function () {
    it('should return start time for a period now +/- totalhours/2', function () {
      var now = new Date().getTime();
      var startTime = fsService.getStartTimeForMultiGet(5, 4); // total = 20 hours

      expect(startTime).toBeGreaterThan(now - 10 * tool.hour() - 1);
      expect(startTime).toBeLessThan   (now - 10 * tool.hour() + 1);
    });
  });

  describe('.getFlightsJSON', function () {
    it("should trace and return 'error' for an incorrect response", function () {
      spyOn(tool, 'trace');

      expect(fsService.getFlightsJSON('not a JSON', 'dep')).toBe('error');
      expect(tool.trace).toHaveBeenCalled();
    });

    it("should trace and return 'error' when 'error' field is present in a response JSON", function () {
      spyOn(tool, 'trace');

      expect(fsService.getFlightsJSON('{"key1": "value1", "error": "an error occurred"}', 'arr')).toBe('error');
      expect(tool.trace).toHaveBeenCalled();
    });

    it("should return 'bad-airport' for bad airport code", function () {
      expect(fsService.getFlightsJSON('{"error": {"errorCode": "BAD_AIRPORT_CODE"}}', 'arr')).toBe('bad-airport');
    });

    it('should return an empty array for an empty response JSON', function () {
      expect(fsService.getFlightsJSON('{}', 'dep')).toBe('[]');
      expect(fsService.getFlightsJSON('{"flightStatuses": []}', 'arr')).toBe('[]');
    });

    it('should return valid models JSON for departure flight statuses', function () {
      var fsaResponse = {
        "appendix": {
          "airlines": [
            {"fs": "B6", "name": "JetBlue Airways"},
            {"fs": "DL", "name": "Delta Air Lines"},
            {"fs": "OK", "name": "Czech Airlines"},
            {"fs": "AM", "name": "Aeromexico"}
          ],
          "airports": [
            {"fs": "BUF", "city": "Buffalo"},
            {"fs": "JFK", "city": "New York"},
            {"fs": "BOS", "city": "Boston"}
          ]
        },
        "flightStatuses": [
          {
            "flightId": 276227628,
            "carrierFsCode": "DL",
            "flightNumber": "2390",
            "departureAirportFsCode": "JFK",
            "arrivalAirportFsCode": "BOS",
            "departureDate": { "dateLocal": "2012-09-30T21:50:00.000" },
            "arrivalDate": { "dateLocal": "2012-09-30T23:15:00.000" },
            "status": "A",
            "operationalTimes": {
              "actualGateDeparture": { "dateLocal": "2012-09-30T21:50:00.000" },
              "actualGateArrival": { "dateLocal": "2012-09-30T23:16:00.000" }
            },
            "codeshares": [
              {"fsCode": "AM", "flightNumber": "5350"},
              {"fsCode": "OK", "flightNumber": "3100"}
            ],
            "airportResources": {
              "departureTerminal": "2",
              "departureGate": "20",
              "arrivalTerminal": "A",
              "arrivalGate": "A20"
            }
          },
          {
            "flightId": 276227644,
            "carrierFsCode": "B6",
            "flightNumber": "10",
            "departureAirportFsCode": "JFK",
            "arrivalAirportFsCode": "BUF",
            "departureDate": { "dateLocal": "2012-09-30T21:10:00.000" },
            "arrivalDate": { "dateLocal": "2012-09-30T22:37:00.000" },
            "status": "L"
          }
        ]
      };
      var fsaJSON = JSON.stringify(fsaResponse);

      expect(JSON.parse(fsService.getFlightsJSON(fsaJSON, 'dep'))).toEqual([
        {
          airport: 'BOS Boston',
          flight: 'DL 2390',
          airline: 'Delta Air Lines',
          schedule: '2012-09-30T21:50',
          actual: '2012-09-30T21:50',
          termgate: 'T-2 20',
          status: 'A'
        },
        {
          codeshare: 1,
          operator: 'DL 2390 Delta Air Lines',
          airport: 'BOS Boston',
          flight: 'AM 5350',
          airline: 'Aeromexico',
          schedule: '2012-09-30T21:50',
          actual: '2012-09-30T21:50',
          termgate: 'T-2 20',
          status: 'A'
        },
        {
          codeshare: 1,
          operator: 'DL 2390 Delta Air Lines',
          airport: 'BOS Boston',
          flight: 'OK 3100',
          airline: 'Czech Airlines',
          schedule: '2012-09-30T21:50',
          actual: '2012-09-30T21:50',
          termgate: 'T-2 20',
          status: 'A'
        },
        {
          airport: 'BUF Buffalo',
          flight: 'B6 10',
          airline: 'JetBlue Airways',
          schedule: '2012-09-30T21:10',
          status: 'L'
        }
      ]);

      expect(JSON.parse(fsService.getFlightsJSON(fsaJSON, 'dep', 'OK'))).toEqual([
        {
          codeshare: 1,
          operator: 'DL 2390 Delta Air Lines',
          date: '2012-09-30',
          airport: 'BOS Boston',
          flight: 'OK 3100',
          airline: 'Czech Airlines',
          schedule: '2012-09-30T21:50',
          actual: '2012-09-30T21:50',
          termgate: 'T-2 20',
          status: 'A'
        }
      ]);
    });

    it('should return valid models JSON for arrival flight statuses', function () {
      var fsaResponse = {
        "appendix": {
          "airlines": [
            {"fs": "B6", "name": "JetBlue Airways"},
            {"fs": "AA", "name": "American Airlines"}
          ],
          "airports": [
            {"fs": "JFK", "city": "New York"},
            {"fs": "SFO", "city": "San Francisco"},
            {"fs": "SEA", "city": "Seattle"}
          ]
        },
        "flightStatuses": [
          {
            "flightId": 276258111,
            "carrierFsCode": "AA",
            "flightNumber": "16",
            "departureAirportFsCode": "SFO",
            "arrivalAirportFsCode": "JFK",
            "departureDate": { "dateLocal": "2012-09-30T12:30:00.000" },
            "arrivalDate": { "dateLocal": "2012-09-30T21:15:00.000" },
            "status": "L"
          },
          {
            "flightId": 276257569,
            "carrierFsCode": "B6",
            "flightNumber": "176",
            "departureAirportFsCode": "SEA",
            "arrivalAirportFsCode": "JFK",
            "departureDate": { "dateLocal": "2012-09-30T12:55:00.000" },
            "arrivalDate": { "dateLocal": "2012-09-30T21:12:00.000" },
            "status": "A",
            "operationalTimes": {
              "actualGateDeparture": { "dateLocal": "2012-09-30T12:49:00.000" },
              "actualGateArrival": { "dateLocal": "2012-09-30T20:52:00.000" }
            },
            "airportResources": {
              "departureTerminal": "A",
              "departureGate": "10",
              "arrivalTerminal": "5",
              "arrivalGate": "9"
            }
          }
        ]
      };
      var fsaJSON = JSON.stringify(fsaResponse);

      expect(JSON.parse(fsService.getFlightsJSON(fsaJSON, 'arr'))).toEqual([
        {
          airport: 'SFO San Francisco',
          flight: 'AA 16',
          airline: 'American Airlines',
          schedule: '2012-09-30T21:15',
          status: 'L'
        },
        {
          airport: 'SEA Seattle',
          flight: 'B6 176',
          airline: 'JetBlue Airways',
          schedule: '2012-09-30T21:12',
          actual: '2012-09-30T20:52',
          termgate: 'T-5 9',
          status: 'A'
        }
      ]);

      expect(JSON.parse(fsService.getFlightsJSON(fsaJSON, 'arr', 'B6'))).toEqual([
        {
          date: '2012-09-30',
          airport: 'SEA Seattle',
          flight: 'B6 176',
          airline: 'JetBlue Airways',
          schedule: '2012-09-30T21:12',
          actual: '2012-09-30T20:52',
          termgate: 'T-5 9',
          status: 'A'
        }
      ]);
    });
  });
});