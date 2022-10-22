package classesAndSkill;




public class RogueClass {
    private String nameClass;
    private double defaultHP;
    private double defaultStamina;
    private double defaultMana;
    //progress and possesions
    private int defaultLevel;
    
    public String getNameClass(){
    this.nameClass = "Rogue";
        return nameClass;
    }
    public double getDefaultHP(){
     this.defaultHP = 100;

        return defaultHP;
    }
    public double getDefaultStamina(){
     this.defaultStamina = 120;

        return defaultStamina;
    }
    public double getDefaultMana(){
     this.defaultMana = 80;
        return defaultMana;
        
    }
    public int getDefaultLevel(){
     this.defaultLevel = 1;
        return defaultLevel;
        
    }
}
