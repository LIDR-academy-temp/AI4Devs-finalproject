import { describe, expect, it } from 'vitest';
import { splitKeyword } from './gherkin';

describe('splitKeyword', () => {
  it.each([
    ['Feature: Checkout', 'Feature', ': Checkout'],
    ['Background:', 'Background', ':'],
    ['Scenario: Pay', 'Scenario', ': Pay'],
    ['Scenario Outline: Pay with <card>', 'Scenario Outline', ': Pay with <card>'],
    ['Examples:', 'Examples', ':'],
    ['Given a cart', 'Given', ' a cart'],
    ['When I pay', 'When', ' I pay'],
    ['Then the total is $10', 'Then', ' the total is $10'],
    ['And a receipt', 'And', ' a receipt'],
    ['But no email', 'But', ' no email'],
  ])('recognizes %s', (line, keyword, rest) => {
    expect(splitKeyword(line)).toEqual({ indent: '', keyword, rest, comment: false });
  });

  it('keeps the indentation', () => {
    expect(splitKeyword('    Given a cart')).toEqual({ indent: '    ', keyword: 'Given', rest: ' a cart', comment: false });
  });

  it('does not treat keyword-like words or mid-line keywords as keywords', () => {
    expect(splitKeyword('Thenceforth nothing').keyword).toBeNull();
    expect(splitKeyword('the user is Given access').keyword).toBeNull();
    expect(splitKeyword('given a cart').keyword).toBeNull();
  });

  it('flags comment lines', () => {
    expect(splitKeyword('  # TODO: edge case')).toEqual({ indent: '  ', keyword: null, rest: '# TODO: edge case', comment: true });
  });

  it('handles empty lines', () => {
    expect(splitKeyword('')).toEqual({ indent: '', keyword: null, rest: '', comment: false });
  });
});
