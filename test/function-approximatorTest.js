var expect = require('chai').expect;

var $ = require('../index');
var FunctionApproximator = $.FunctionApproximator;
var ValueFunction = $.ValueFunction;

describe('Function Approximator', function() {
    it('should exist', function() {
        expect(FunctionApproximator).to.exist;
    });
    it('should be instantiated', function() {
        expect(new FunctionApproximator()).to.exist;
    });

    describe('characteristics of a function approximator', function() {
        it('should have an empty list of ActionValueFunctionPairs', function() {
            var fa = new FunctionApproximator();

            var valueFunctions = fa.getValueFunctions();

            expect(valueFunctions).to.deep.equal([]);
        });

        describe('valueFunction / utilityFunction', function() {
            it('should be defined', function() {
                expect(ValueFunction).to.exist;
            });
            it('should be instantiated', function() {
                expect(new ValueFunction()).to.exist;
            });

            it('should give a value of 0 if not initiated with a function', function() {
                var vf = new ValueFunction();
                expect(vf.getValue()).to.equal(0);
            });

            it('should give a different values for different states', function() {
                var vf = new ValueFunction(function(s) {
                    return s.x;
                });
                expect(vf.getValue({x: 1})).to.equal(1);
                expect(vf.getValue({x: 2})).to.equal(2);
            });

            it('should be initialized with a weight with the given weighting intitialisation function', function() {
                var vf = new ValueFunction(null, function(){ return 1; });
                expect(vf.getWeight()).to.equal(1);

                vf = new ValueFunction();
                expect(vf.getWeight()).to.equal(1);

                vf = new ValueFunction(null, function(){ return 1*3; });
                expect(vf.getWeight()).to.equal(3);
            });

            it('should weigh its value', function() {
                var vf = new ValueFunction(function(s) { return s.x; }, function(){ return 0.5; });
                expect(vf.getValue({x: 8})).to.equal(4);
            });

            it('should lower its weight with a given learningRate', function() {
                var vf = new ValueFunction(function(s) { return s.x; }, function(){ return 0.5; });
                var state = {x: 8};
                var value = vf.getValue(state);
                expect(value).to.equal(4);
                vf.correct(value, 2, 0.1, state);
                // diff of 2 * x * learningRate == -1.6
                expect(vf.getWeight()).to.equal(-1.1)
            });

            it('should heighten its weight with a given learningRate', function() {
                var vf = new ValueFunction(function(s) { return s.x; }, function(){ return 0.5; });
                var state = {x: 8};
                var value = vf.getValue(state);
                expect(value).to.equal(4);
                vf.correct(value, 6, 0.1, state);
                // diff of 2 * x * learningRate == 1.6
                expect(vf.getWeight()).to.equal(2.1)
            });

            it('should scale its weight', function(){
                var originalWeight = 1;
                var multiplier = 0.5;
                var vf = new ValueFunction(function(s) { return 1; }, function() { return originalWeight; });

                vf.scale(multiplier);

                expect(vf.getWeight()).to.equal(originalWeight * multiplier);
            });
        });

        it('should add valuefunctions', function() {
            var fa = new FunctionApproximator();
            fa.addValueFunction(new ValueFunction());
            expect(fa.getValueFunctions().length).to.equal(1);
            fa.addValueFunction(new ValueFunction());
            expect(fa.getValueFunctions().length).to.equal(2);
        });

        it('should calculate the value of a state as a average of all its valuefunctions', function() {
            var fa = new FunctionApproximator();
            fa.addValueFunction(new ValueFunction(function(s) {
                return 1;
            }));

            fa.addValueFunction(new ValueFunction(function(s) {
                return 2;
            }));

            expect(fa.getValue()).to.equal(3);
        });

        it('should initialise the weights of its valuefunctions with a strategy', function() {
            var fa = new FunctionApproximator(function() { return 0.5; });
            var vf = fa.createValueFunction(function(s) { return s.x; });
            expect(vf.getWeight()).to.equal(0.5);

        });

        it('should calculate the value of a state as the sum of the value of all its weighted valuefunctions', function() {
            var fa = new FunctionApproximator(function() { return 0.5; });
            fa.addValueFunction(
                fa.createValueFunction(function(s) {
                return 1;
            }));

            fa.addValueFunction(fa.createValueFunction(function(s) {
                return 2;
            }));

            expect(fa.getValue()).to.equal(1.5);
        });

        it('should be initialized with a learning rate', function() {
            var fa = new FunctionApproximator();
            expect(fa.getLearningRate()).to.equal(0.1);
            fa = new FunctionApproximator(null, 0.2);
            expect(fa.getLearningRate()).to.equal(0.2);
        });

        it('should heighten the weights of all value functions', function() {
            var fa = new FunctionApproximator(function() { return 1;}, 0.1);
            fa.addValueFunction(
                fa.createValueFunction(function(s) { return s.x; }, function() { return 0.5; } )
            );
            fa.addValueFunction(
                fa.createValueFunction(function(s) { return s.y; }, function() { return 0.2; }  )
            );
            fa.addValueFunction(
                fa.createValueFunction(function(s) { return 1; }, function() { return 0.1; }  )
            );


            var state = { x: 1, y: 1 };
            expect(fa.getValue({x:1,y:1})).to.be.within(0.799, 0.801);
            fa.correct(state, 0.4);

            expect(fa.getValueFunctions()[0].getWeight()).to.be.within(0.459, 0.461);
            expect(fa.getValueFunctions()[1].getWeight()).to.be.within(0.159, 0.161);
            expect(fa.getValueFunctions()[2].getWeight()).to.be.within(0.059, 0.061);

        });

        it('should be able to choose between states on the basis of their utility', function() {
            var fa = new FunctionApproximator();
            fa.addValueFunction(
                fa.createValueFunction(function(s) { return s.x; } )
            );
            fa.addValueFunction(
                fa.createValueFunction(function(s) { return s.y; } )
            );

            var states = [];
            states.push({state: {x: 0, y: 0}, action: "stay"});
            states.push({state: {x: 1, y: 1}, action: "diagonal"});
            states.push({state: {x: 0, y: 1}, action: "up"});

            var chosen = fa.evaluate(states);
            expect(fa.evaluate(states).action).to.equal("diagonal");
            states.push({state: {x: 0, y: 8}, action: "FTW"});

            expect(fa.evaluate(states).action).to.equal("FTW");
        });

        it('should explore if the explorationrate is 100% and not explore if it is 0%', function() {
            var states = [];
            states.push({state: {x: 0}, action: "explored"});
            states.push({state: {x: 1}, action: "highest"});

            var explorerfa = new FunctionApproximator(null,null,1,null);
            explorerfa.addValueFunction(
                explorerfa.createValueFunction(function(s) { return s.x; } )
            );
            expect(explorerfa.evaluate(states).action).to.equal("explored");

            var nonexplorerfa = new FunctionApproximator(null,null,0,null);
            nonexplorerfa.addValueFunction(
                nonexplorerfa.createValueFunction(function(s) { return s.x; } )
            );
            expect(nonexplorerfa.evaluate(states).action).to.equal("highest");
        });
    });
});
