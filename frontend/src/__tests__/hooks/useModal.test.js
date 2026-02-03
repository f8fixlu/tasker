import { renderHook, act } from '@testing-library/react';
import useModal from '../hooks/useModal';

describe('useModal Hook', () => {
  test('should initialize with empty modals', () => {
    const { result } = renderHook(() => useModal());
    
    expect(result.current.modals).toEqual({});
    expect(Object.keys(result.current.modals)).toHaveLength(0);
  });

  test('should open a modal correctly', () => {
    const { result } = renderHook(() => useModal());
    
    act(() => {
      result.current.openModal('testModal', { testData: 'test' });
    });
    
    expect(result.current.isModalOpen('testModal')).toBe(true);
    expect(result.current.getModalData('testModal')).toEqual({ testData: 'test' });
  });

  test('should close a modal correctly', () => {
    const { result } = renderHook(() => useModal());
    
    act(() => {
      result.current.openModal('testModal');
      result.current.closeModal('testModal');
    });
    
    expect(result.current.isModalOpen('testModal')).toBe(false);
  });

  test('should close all modals correctly', () => {
    const { result } = renderHook(() => useModal());
    
    act(() => {
      result.current.openModal('modal1');
      result.current.openModal('modal2');
      result.current.closeAllModals();
    });
    
    expect(result.current.isModalOpen('modal1')).toBe(false);
    expect(result.current.isModalOpen('modal2')).toBe(false);
  });

  test('should return null for non-existent modal data', () => {
    const { result } = renderHook(() => useModal());
    
    expect(result.current.getModalData('nonExistentModal')).toBeNull();
  });

  test('should return false for non-existent modal status', () => {
    const { result } = renderHook(() => useModal());
    
    expect(result.current.isModalOpen('nonExistentModal')).toBe(false);
  });
});